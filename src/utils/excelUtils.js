import * as XLSX from 'xlsx';

export const getCellValue = (worksheet, row, col) => {
    const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
    const cell = worksheet[cellAddress];
    return cell ? cell.v : null;
};

export const processExcelFile = (file, listaProductos) => {
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
                let numDeal, costoAuma = 0, costoMsa = 0, costoValmet = 0, preparado, preparado_unva, preparado_unai, responsable, vistoBueno;
                if (getCellValue(ofertaSheet, 352, 113)) {
                    numDeal = getCellValue(ofertaSheet, 352, 113);
                    preparado = getCellValue(datosSheet, 10, 5);
                    preparado_unva = getCellValue(datosSheet, 11, 5);
                    preparado_unai = getCellValue(datosSheet, 12, 5);
                    responsable = getCellValue(datosSheet, 13, 5);
                    vistoBueno = getCellValue(datosSheet, 14, 5);
                } else {
                    numDeal = getCellValue(ofertaSheet, 235, 113)
                    preparado = getCellValue(datosSheet, 10, 5);
                    responsable = getCellValue(datosSheet, 11, 5);
                    vistoBueno = getCellValue(datosSheet, 12, 5);
                }

                if (!preparado) {
                    preparado = preparado_unva || preparado_unai;
                }
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

                const extractedData = {
                    fileName: file.name,
                    numDeal: numDeal || 'N/A',
                    name: file.name.slice(0, -5),
                    preparado,
                    preparado_unva,
                    preparado_unai,
                    responsable,
                    vistoBueno,
                    rubrica: getCellValue(resumenSheet, 24, 12),
                    utilidad: getCellValue(resumenSheet, 30, 5),
                    productos: productos,
                    costoAuma: costoAuma,
                    costoMsa: costoMsa,
                    costoValmet: costoValmet,
                };

                resolve(extractedData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

const extractProductos = (sheet, listaProductos) => {
    const productos = [];
    let col = 5;
    for (let i = 0; i < 20; i++) {
        const currentCol = col + i;
        const hasValue = getCellValue(sheet, 18, currentCol);
        if (!hasValue) continue;
        const nombre = getCellValue(sheet, 2, currentCol);
        const precio = getCellValue(sheet, 20, currentCol) || 0;
        const productoInfo = listaProductos[nombre];
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