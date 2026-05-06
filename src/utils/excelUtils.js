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

// Formato esperado: 1-3 mayúsculas + punto + apellido (ej: C.Ordaz, MA.Lopez)
const NAME_PATTERN = /^[A-ZÁÉÍÓÚÑ]{1,3}\.[A-ZÁÉÍÓÚ][a-záéíóúñA-ZÁÉÍÓÚÑ]+$/;
const NAME_BLACKLIST = ['N.Ingresante'];

const isValidName = (val) => {
    if (!val) return false;
    const s = String(val).trim();
    return NAME_PATTERN.test(s) && !NAME_BLACKLIST.includes(s);
};

// numDeal acepta cualquier valor no vacío; los campos de nombre requieren formato válido
const NAME_ANCHOR_FIELDS = new Set(['preparado', 'vistoBueno', 'responsable']);

const scoreTemplateVersion = (workbook, campos) => {
    const ANCHOR_FIELDS = ['numDeal', 'preparado', 'vistoBueno', 'responsable'];
    return ANCHOR_FIELDS.reduce((score, fieldName) => {
        const campo = campos.find(c => c.campo_interno === fieldName);
        if (!campo) return score;
        const val = getCellValue(getSheet(workbook, campo.hoja), campo.fila, campo.columna);
        if (val === null || val === undefined || String(val).trim() === '') return score;
        if (NAME_ANCHOR_FIELDS.has(fieldName)) {
            return isValidName(val) ? score + 1 : score;
        }
        return score + 1;
    }, 0);
};

const detectBestVersion = (workbook, allVersions) => {
    let best = null;
    let bestScore = 0;
    for (const version of allVersions) {
        const score = scoreTemplateVersion(workbook, version.campos || []);
        if (score > bestScore) {
            bestScore = score;
            best = version;
        }
    }
    return best;
};

// Anclas para detección hardcodeada (sin template_versions)
const HARDCODED_TEMPLATES = [
    {
        anchors: [[352, 113], [351, 113], [350, 112]],
        read: (ofertaSheet, datosSheet) => ({
            numDeal: getCellValue(ofertaSheet, 352, 113),
            preparado: getCellValue(datosSheet, 10, 5),
            responsable: getCellValue(datosSheet, 11, 5),
            vistoBueno: getCellValue(datosSheet, 12, 5),
            preparado_unau: getCellValue(datosSheet, 24, 5),
            preparado_unva: getCellValue(datosSheet, 25, 5),
            preparado_unai: getCellValue(datosSheet, 26, 5),
            preparado_unap: getCellValue(datosSheet, 27, 5),
            preparado_unepc: getCellValue(datosSheet, 28, 5),
            preparado_pic: getCellValue(datosSheet, 29, 5),
            preparado_pau: getCellValue(datosSheet, 30, 5),
            responsable_unau: getCellValue(datosSheet, 31, 5),
            responsable_unva: getCellValue(datosSheet, 32, 5),
            responsable_unai: getCellValue(datosSheet, 33, 5),
            responsable_unap: getCellValue(datosSheet, 34, 5),
            responsable_unepc: getCellValue(datosSheet, 35, 5),
            responsable_pic: getCellValue(datosSheet, 36, 5),
            responsable_pau: getCellValue(datosSheet, 37, 5),
        }),
    },
    {
        anchors: [[235, 113], [234, 113], [233, 112]],
        read: (ofertaSheet, datosSheet) => ({
            numDeal: getCellValue(ofertaSheet, 235, 113),
            preparado: getCellValue(datosSheet, 10, 5),
            responsable: getCellValue(datosSheet, 11, 5),
            vistoBueno: getCellValue(datosSheet, 12, 5),
            preparado_unau: null, preparado_unva: null, preparado_unai: null,
            preparado_unap: null, preparado_unepc: null, preparado_pic: null, preparado_pau: null,
            responsable_unau: null, responsable_unva: null, responsable_unai: null,
            responsable_unap: null, responsable_unepc: null, responsable_pic: null, responsable_pau: null,
        }),
    },
];

export const processExcelFile = (file, listaProductos, fieldMappings = null, allVersions = []) => {
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

                // Resolver qué campos usar: versión seleccionada, autodetectada, o hardcodeada
                let resolvedMappings = fieldMappings;
                if (!resolvedMappings && allVersions.length > 0) {
                    const best = detectBestVersion(workbook, allVersions);
                    if (best) resolvedMappings = best.campos;
                }

                if (resolvedMappings && resolvedMappings.length > 0) {
                    const getFieldValue = (campoInterno) => {
                        const campo = resolvedMappings.find(c => c.campo_interno === campoInterno);
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
                    // Fallback hardcodeado: puntuar cada plantilla conocida por sus anclas
                    const scoreAnchors = (anchors) => anchors.reduce((s, [r, c]) => {
                        const v = getCellValue(ofertaSheet, r, c);
                        return v !== null && String(v).trim() !== '' ? s + 1 : s;
                    }, 0);

                    const detected = HARDCODED_TEMPLATES.reduce((best, tpl) => {
                        const score = scoreAnchors(tpl.anchors);
                        return score > best.score ? { tpl, score } : best;
                    }, { tpl: HARDCODED_TEMPLATES[HARDCODED_TEMPLATES.length - 1], score: -1 });

                    const fields = detected.tpl.read(ofertaSheet, datosSheet);
                    ({ numDeal, preparado, responsable, vistoBueno,
                       preparado_unau, preparado_unva, preparado_unai, preparado_unap,
                       preparado_unepc, preparado_pic, preparado_pau,
                       responsable_unau, responsable_unva, responsable_unai, responsable_unap,
                       responsable_unepc, responsable_pic, responsable_pau } = fields);
                    rubrica = getCellValue(resumenSheet, 24, 12);
                    utilidad = getCellValue(resumenSheet, 30, 5);
                }

                const pickValidName = (...candidates) =>
                    candidates.find(v => isValidName(v)) || 'D.Rejas';

                preparado = pickValidName(
                    preparado, preparado_unva, preparado_unai, preparado_unap,
                    preparado_unepc, preparado_pic, preparado_pau, preparado_unau
                );
                responsable = pickValidName(
                    responsable, responsable_unau, responsable_unva, responsable_unai,
                    responsable_unap, responsable_unepc, responsable_pic, responsable_pau
                );
                if (vistoBueno && !isValidName(vistoBueno)) vistoBueno = null;

                const productos = extractProductos(resumenSheet, listaProductos);
                for (let i = 0; i < 20; i++) {
                    const nombre = getCellValue(resumenSheet, 2, 5 + i);
                    const costo = getCellValue(resumenSheet, 3, 5 + i);
                    if (costo && nombre) {
                        const nombreStr = String(nombre);
                        if (nombreStr.startsWith("Auma")) costoAuma += costo;
                        if (nombreStr.startsWith("MSA")) costoMsa += costo;
                        if (nombreStr.startsWith("Valmet")) costoValmet += costo;
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
