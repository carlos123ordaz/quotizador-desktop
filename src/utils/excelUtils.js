import * as XLSX from 'xlsx';

export const getCellValue = (worksheet, row, col) => {
    const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
    const cell = worksheet[cellAddress];
    return cell ? cell.v : null;
};

const getSheet = (workbook, hoja) => {
    const map = {
        Datos: workbook.Sheets['Datos'],
        Oferta: workbook.Sheets['Oferta'],
        Resumen: workbook.Sheets['Resumen'],
    };
    return map[hoja] || workbook.Sheets['Datos'];
};

export const processExcelFile = (file, listaProductos, fieldMappings = null) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const ofertaSheet = workbook.Sheets['Oferta'];
                const datosSheet = workbook.Sheets['Datos'];
                const resumenSheet = workbook.Sheets['Resumen'];

                if (!datosSheet || !ofertaSheet || !resumenSheet) {
                    reject(new Error('No se encontraron todas las hojas necesarias'));
                    return;
                }

                let numDeal, costoAuma = 0, costoMsa = 0, costoValmet = 0;
                let preparado, preparado_unau, preparado_unva, preparado_unai,
                    preparado_unap, preparado_unepc, preparado_pic, preparado_pau;
                let responsable, responsable_unau, responsable_unva, responsable_unai,
                    responsable_unap, responsable_unepc, responsable_pic, responsable_pau;
                let vistoBueno, rubrica, utilidad;

                if (fieldMappings && fieldMappings.length > 0) {
                    const getFieldValue = (campoInterno) => {
                        const campo = fieldMappings.find(c => c.campo_interno === campoInterno);
                        if (!campo) return null;
                        return getCellValue(getSheet(workbook, campo.hoja), campo.fila, campo.columna);
                    };

                    numDeal = getFieldValue('numDeal')
                        || getCellValue(ofertaSheet, 352, 113)
                        || getCellValue(ofertaSheet, 235, 113);
                    preparado = getFieldValue('preparado');
                    responsable = getFieldValue('responsable');
                    vistoBueno = getFieldValue('vistoBueno');
                    preparado_unau = getFieldValue('preparado_unau');
                    preparado_unva = getFieldValue('preparado_unva');
                    preparado_unai = getFieldValue('preparado_unai');
                    preparado_unap = getFieldValue('preparado_unap');
                    preparado_unepc = getFieldValue('preparado_unepc');
                    preparado_pic = getFieldValue('preparado_pic');
                    preparado_pau = getFieldValue('preparado_pau');
                    responsable_unau = getFieldValue('responsable_unau');
                    responsable_unva = getFieldValue('responsable_unva');
                    responsable_unai = getFieldValue('responsable_unai');
                    responsable_unap = getFieldValue('responsable_unap');
                    responsable_unepc = getFieldValue('responsable_unepc');
                    responsable_pic = getFieldValue('responsable_pic');
                    responsable_pau = getFieldValue('responsable_pau');
                    rubrica = getFieldValue('rubrica') || getCellValue(resumenSheet, 24, 12);
                    utilidad = getFieldValue('utilidad') || getCellValue(resumenSheet, 30, 5);
                } else {
                    if (getCellValue(ofertaSheet, 352, 113)) {
                        numDeal = getCellValue(ofertaSheet, 352, 113);
                        preparado = getCellValue(datosSheet, 10, 5);
                        responsable = getCellValue(datosSheet, 11, 5);
                        vistoBueno = getCellValue(datosSheet, 12, 5);
                        preparado_unau = getCellValue(datosSheet, 24, 5);
                        preparado_unva = getCellValue(datosSheet, 25, 5);
                        preparado_unai = getCellValue(datosSheet, 26, 5);
                        preparado_unap = getCellValue(datosSheet, 27, 5);
                        preparado_unepc = getCellValue(datosSheet, 28, 5);
                        preparado_pic = getCellValue(datosSheet, 29, 5);
                        preparado_pau = getCellValue(datosSheet, 30, 5);
                        responsable_unau = getCellValue(datosSheet, 31, 5);
                        responsable_unva = getCellValue(datosSheet, 32, 5);
                        responsable_unai = getCellValue(datosSheet, 33, 5);
                        responsable_unap = getCellValue(datosSheet, 34, 5);
                        responsable_unepc = getCellValue(datosSheet, 35, 5);
                        responsable_pic = getCellValue(datosSheet, 36, 5);
                        responsable_pau = getCellValue(datosSheet, 37, 5);
                    } else {
                        numDeal = getCellValue(ofertaSheet, 235, 113);
                        preparado = getCellValue(datosSheet, 10, 5);
                        responsable = getCellValue(datosSheet, 11, 5);
                        vistoBueno = getCellValue(datosSheet, 12, 5);
                    }
                    rubrica = getCellValue(resumenSheet, 24, 12);
                    utilidad = getCellValue(resumenSheet, 30, 5);
                }

                if (!preparado) {
                    preparado = preparado_unva || preparado_unai || preparado_unap
                        || preparado_unepc || preparado_pic || preparado_pau || 'D.Rejas';
                }
                if (!responsable) {
                    responsable = responsable_unau || responsable_unva || responsable_unai
                        || responsable_unap || responsable_unepc || responsable_pic || responsable_pau || 'D.Rejas';
                }
                if (!preparado || preparado.includes('N.Ingresante')) preparado = 'D.Rejas';
                if (!responsable || responsable.includes('N.Ingresante')) responsable = 'D.Rejas';

                const productos = extractProductos(resumenSheet, listaProductos);
                for (let i = 0; i < 20; i++) {
                    const nombre = getCellValue(resumenSheet, 2, 5 + i);
                    const costo = getCellValue(resumenSheet, 3, 5 + i);
                    if (costo) {
                        if (nombre.startsWith("Auma")) costoAuma += costo;
                        if (nombre.startsWith("MSA")) costoMsa += costo;
                        if (nombre.startsWith("Valmet")) costoValmet += costo;
                    }
                }

                resolve({
                    fileName: file.name,
                    numDeal: numDeal || 'N/A',
                    name: file.name.slice(0, -5),
                    preparado,
                    preparado_unau,
                    preparado_unva,
                    preparado_unai,
                    preparado_unap,
                    preparado_unepc,
                    preparado_pic,
                    preparado_pau,
                    responsable,
                    responsable_unau,
                    responsable_unva,
                    responsable_unai,
                    responsable_unap,
                    responsable_unepc,
                    responsable_pic,
                    responsable_pau,
                    vistoBueno,
                    rubrica,
                    utilidad,
                    productos,
                    costoAuma,
                    costoMsa,
                    costoValmet,
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

const extractProductos = (sheet, listaProductos) => {
    console.log('Extrayendo productos del resumenSheet...');
    const productos = [];
    let col = 5;
    for (let i = 0; i < 20; i++) {
        const currentCol = col + i;
        const hasValue = getCellValue(sheet, 18, currentCol);
        console.log(`Columna ${currentCol}: ${hasValue}`);
        if (!hasValue) continue;
        const nombre = getCellValue(sheet, 2, currentCol);
        const precio = getCellValue(sheet, 20, currentCol) || 0;
        const productoInfo = listaProductos[nombre];
        console.log(nombre);
        if (productoInfo) {
            productos.push({
                cantidad: 1,
                nombre: nombre,
                tasa: 0,
                precio: precio,
                productId: productoInfo[0],
                unidadNegocio: productoInfo[1],
                total: precio
            });
        }
    }
    return productos;
};

export const calcularTotalesPorArea = (productos) => {
    const totales = {
        UNAU: 0,
        UNAI: 0,
        UNVA: 0,
        Servicios: 0,
        Proyectos: 0,
        HSEQ: 0,
        Otros: 0
    };

    productos.forEach(producto => {
        const area = producto.unidadNegocio;
        if (totales.hasOwnProperty(area)) {
            totales[area] += producto.precio || 0;
        } else {
            totales.Otros += producto.precio || 0;
        }
    });

    return totales;
};

export const formatDateForBitrix = (dateString) => {
    if (!dateString) return '';
    return `${dateString}T03:00:00+03:00`;
};

export const isValidDate = (dateString) => {
    if (!dateString || dateString.length !== 10) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};
