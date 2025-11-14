import { useState, useCallback, useEffect, useContext } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert,
    Stepper,
    Step,
    StepLabel,
    CircularProgress
} from '@mui/material';
import {
    CloudUpload,
    Delete,
    Send,
    Description,
    Info,
    Warning,
    CheckCircle,
    InsertDriveFile,
} from '@mui/icons-material';
import { calcularTotalesPorArea, formatDateForBitrix, isValidDate, processExcelFile } from '../utils/excelUtils';
import { lista_area, depart_cisac, unidad_negocio, getEmpleadoId } from '../utils/bitrixUtils';
import axios from 'axios';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';
import numeral from 'numeral';

export const BitrixIntegration = () => {
    const [files, setFiles] = useState([]);
    const [selectedFileIndex, setSelectedFileIndex] = useState(null);
    const [currentFileData, setCurrentFileData] = useState(null);
    const [listaProductos, setListaProductos] = useState({})
    const [empleados, setEmpleados] = useState([])
    const [loading, setLoading] = useState(false);
    const [createQuote, setCreateQuote] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { user } = useContext(MainContext);
    const [formData, setFormData] = useState({
        crearQuote: false,
        numQuote: '',
        fechaCorreo: '',
        fechaInicio: '',
        fechaEnvio: '',
        fechaCierre: '',
        cambiarFechaCierre: false
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const fioriColors = {
        primary: '#0070F2',
        secondary: '#6E6E6E',
        success: '#2B7D2B',
        warning: '#E76500',
        error: '#BB0000',
        background: '#F5F5F5',
        cardBg: '#FFFFFF',
        border: '#D9D9D9'
    };

    const handleFileUpload = async (event) => {
        const uploadedFiles = Array.from(event.target.files);
        setLoading(true);
        setErrorMessage('');

        try {
            const processedFiles = await Promise.all(
                uploadedFiles.map(async (file) => {
                    try {
                        const data = await processExcelFile(file, listaProductos);
                        return {
                            file,
                            data,
                            status: 'pending',
                            id: Math.random().toString(36).substr(2, 9)
                        };
                    } catch (error) {
                        return {
                            file,
                            data: null,
                            status: 'error',
                            error: error.message,
                            id: Math.random().toString(36).substr(2, 9)
                        };
                    }
                })
            );

            setFiles((prev) => [...prev, ...processedFiles]);

            if (processedFiles.length > 0 && selectedFileIndex === null) {
                setSelectedFileIndex(0);
                setCurrentFileData(processedFiles[0].data);
            }
        } catch (error) {
            setErrorMessage('Error al procesar archivos: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    const getProductos = async () => {
        try {
            const response = await axios.get(`${CONFIG.uri}/products`, { params: { skip: 0, limit: 500 } });
            const productos = response.data.productos;
            const data = {};
            productos.forEach(producto => {
                data[producto.name_excel] = [
                    producto.code,
                    producto.unidad_negocio,
                    producto.area1,
                    producto.area2
                ];
            });
            console.log(data);
            setListaProductos(data);
        } catch (error) {
            setErrorMessage('Error al obtener productos: ' + error.message);
        }
    }

    const getEmpleados = async () => {
        try {
            const response = await axios.get(`${CONFIG.uri}/employees`, { params: { skip: 0, limit: 500 } });
            const employess = response.data.empleados;
            const data = {};
            employess.forEach(e => {
                data[e.nombre] = e.codigo
            });
            setEmpleados(data);
        } catch (error) {
            setErrorMessage('Error al obtener empleados: ' + error.message);
        }
    }

    useEffect(() => {
        getProductos();
        getEmpleados();
    }, [])

    const handleSelectFile = (index) => {
        setSelectedFileIndex(index);
        setCurrentFileData(files[index].data);
        setFormData({
            crearQuote: false,
            numQuote: '',
            fechaCorreo: '',
            fechaInicio: '',
            fechaEnvio: '',
            fechaCierre: '',
            cambiarFechaCierre: false
        });
        setErrors({});
    };

    const handleDeleteFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);

        if (index === selectedFileIndex) {
            if (newFiles.length > 0) {
                setSelectedFileIndex(0);
                setCurrentFileData(newFiles[0].data);
            } else {
                setSelectedFileIndex(null);
                setCurrentFileData(null);
            }
        } else if (index < selectedFileIndex) {
            setSelectedFileIndex(selectedFileIndex - 1);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (createQuote) {
            if (!formData.fechaCorreo) {
                newErrors.fechaCorreo = 'Fecha de correo requerida';
            } else if (!isValidDate(formData.fechaCorreo)) {
                newErrors.fechaCorreo = 'Formato de fecha inválido (YYYY-MM-DD)';
            }

            if (!formData.fechaInicio) {
                newErrors.fechaInicio = 'Fecha de inicio requerida';
            } else if (!isValidDate(formData.fechaInicio)) {
                newErrors.fechaInicio = 'Formato de fecha inválido (YYYY-MM-DD)';
            }

            if (!formData.fechaEnvio) {
                newErrors.fechaEnvio = 'Fecha de envío requerida';
            } else if (!isValidDate(formData.fechaEnvio)) {
                newErrors.fechaEnvio = 'Formato de fecha inválido (YYYY-MM-DD)';
            }
        } else {
            if (!formData.numQuote || formData.numQuote.trim() === '') {
                newErrors.numQuote = 'El número de quote es requerido';
            }
        }

        if (formData.cambiarFechaCierre && formData.fechaCierre) {
            if (!isValidDate(formData.fechaCierre)) {
                newErrors.fechaCierre = 'Formato de fecha inválido (YYYY-MM-DD)';
            }
        }
        if (!getEmpleadoId(currentFileData.preparado, empleados)) {
            newErrors.preparado = 'Usuario no encontrado';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildDealPayload = () => {
        const productos = currentFileData.productos.map(p => ({
            PRODUCT_ID: p.productId,
            PRICE: p.precio,
            QUANTITY: p.cantidad,
            TAX_RATE: p.tasa
        }));

        const params = {
            ID: currentFileData.numDeal,
            fields: {
                "UF_CRM_5716A1B729B20": currentFileData.rubrica,
                "UF_CRM_1579309558": lista_area(productos, "UNAU", 0, listaProductos),
                "UF_CRM_1579308051": lista_area(productos, "UNAI", 0, listaProductos),
                "UF_CRM_1579309681": lista_area(productos, "UNVA", 0, listaProductos),
                "UF_CRM_5716A1B71750E": lista_area(productos, "serv", 0, listaProductos),
                "UF_CRM_1444152618": depart_cisac(productos, 0, listaProductos),
                "UF_CRM_1672638903": currentFileData.utilidad,
                "UF_CRM_1579702489": depart_cisac(productos, 0, listaProductos).length > 1 ? 1 : 0,
                "ASSIGNED_BY_ID": getEmpleadoId(currentFileData.responsable, empleados)
            }
        };

        const unidadNeg = unidad_negocio(productos, 0, listaProductos);
        if (unidadNeg.length > 0) {
            params.fields['UF_CRM_1579123522'] = unidadNeg;
        }

        if (currentFileData.costoAuma !== 0) {
            params.fields['UF_CRM_1470168697'] = currentFileData.costoAuma;
        }
        if (currentFileData.costoMsa !== 0) {
            params.fields['UF_CRM_1536612671'] = currentFileData.costoMsa;
        }
        if (currentFileData.costoValmet !== 0) {
            params.fields['UF_CRM_1672640891'] = currentFileData.costoValmet;
        }

        if (formData.cambiarFechaCierre && formData.fechaCierre) {
            params.fields['CLOSEDATE'] = formatDateForBitrix(formData.fechaCierre);
        }

        return params;
    };

    const buildQuotePayload = (dealData, numQuote = null) => {
        const productos = currentFileData.productos.map(p => ({
            PRODUCT_ID: p.productId,
            PRICE: p.precio,
            QUANTITY: p.cantidad,
            TAX_RATE: p.tasa
        }));
        const procedencia = { '1261': 1265, '1701': 1705, '1263': 1165 };

        if (createQuote && dealData) {
            return {
                fields: {
                    "TITLE": dealData['TITLE'],
                    "CURRENCY_ID": dealData['CURRENCY_ID'],
                    "DEAL_ID": currentFileData.numDeal,
                    "COMPANY_ID": dealData['COMPANY_ID'],
                    "CONTACT_ID": dealData['CONTACT_ID'],
                    "BEGINDATE": dealData['BEGINDATE'],
                    "CLOSEDATE": dealData['CLOSEDATE'],
                    "ASSIGNED_BY_ID": dealData['ASSIGNED_BY_ID'],
                    "UTM_SOURCE": dealData['UTM_SOURCE'],
                    "UTM_MEDIUM": dealData['UTM_MEDIUM'],
                    "UTM_CAMPAIGN": dealData['UTM_CAMPAIGN'],
                    "UTM_CONTENT": dealData['UTM_CONTENT'],
                    "UTM_TERM": dealData['UTM_TERM'],
                    "LEAD_ID": dealData['LEAD_ID'],
                    "UF_CRM_1672643073": dealData['UF_CRM_1672642957'],
                    "UF_CRM_1672643100": dealData['UF_CRM_1672643001'],
                    "UF_CRM_1672643342": dealData['UF_CRM_1672643298'],
                    "UF_CRM_62AB9AAFA8FE1": dealData['UF_CRM_1655413285'],
                    "UF_CRM_1579190330": dealData['UF_CRM_1579190263'],
                    "UF_CRM_5611E9B1B1870": parseInt(dealData['UF_CRM_5716A1B70005A']) - 169,
                    "UF_CRM_5611E9B1C3BD5": dealData['UF_CRM_5716A1B709633'],
                    "UF_CRM_5B43D5CD2195D": Array.isArray(dealData['UF_CRM_1531171994'])
                        ? dealData['UF_CRM_1531171994'].map(x =>
                            procedencia[String(x)] || (parseInt(x) > 1200 ? parseInt(x) + 2 : parseInt(x) + 40)
                        )
                        : dealData['UF_CRM_1531171994'],
                    "UF_CRM_5611E9B18B540": Array.isArray(dealData['UF_CRM_5716A1B6EA8CF'])
                        ? dealData['UF_CRM_5716A1B6EA8CF'].map(x => parseInt(x) - 169)
                        : dealData['UF_CRM_5716A1B6EA8CF'],
                    "UF_CRM_1579123526": Array.isArray(dealData['UF_CRM_1579123522'])
                        ? dealData['UF_CRM_1579123522'].map(x => parseInt(x) + 6)
                        : dealData['UF_CRM_1579123522'],
                    "UF_CRM_599F061D53C4B": parseInt(dealData['UF_CRM_1503584748']) + 32,
                    "UF_CRM_561405881EE7D": Array.isArray(dealData['UF_CRM_1444152618'])
                        ? dealData['UF_CRM_1444152618'].map(x =>
                            parseInt(x) === 2087 ? parseInt(x) + 2 : parseInt(x) + 6
                        )
                        : dealData['UF_CRM_1444152618'],
                    "UF_CRM_1444015918": Array.isArray(dealData['UF_CRM_5716A1B71750E'])
                        ? dealData['UF_CRM_5716A1B71750E'].map(x => {
                            const val = parseInt(x);
                            if (val === 2095) return val + 2;
                            if (val > 2000) return val + 8;
                            if (val === 530 || val === 532) return val - 167;
                            return val - 169;
                        })
                        : dealData['UF_CRM_5716A1B71750E'],
                    "UF_CRM_5611F0F434963": dealData['UF_CRM_1444016101'],
                    "UF_CRM_1579118591": [getEmpleadoId(currentFileData.preparado, empleados)],
                    "UF_CRM_QUOTE_1726248570": [getEmpleadoId(currentFileData.preparado_unva, empleados)],
                    "UF_CRM_QUOTE_1726248646": [getEmpleadoId(currentFileData.preparado_unai, empleados)],
                    "UF_CRM_1444016304": getEmpleadoId(currentFileData.vistoBueno, empleados),
                    "UF_CRM_5F2A353D3EE36": dealData['UF_CRM_1596601522'],
                    "UF_CRM_1579702544": dealData['UF_CRM_1579702489'],
                    "UF_CRM_5ABA80EAD4C53": dealData['UF_CRM_1522157323'],
                    "UF_CRM_57A0FECB87D98": dealData['UF_CRM_1470168697'],
                    "UF_CRM_1536612809": dealData['UF_CRM_1536612671'],
                    "UF_CRM_1672641073": dealData['UF_CRM_1672640891'],
                    "UF_CRM_1579310925": formatDateForBitrix(formData.fechaCorreo),
                    "UF_CRM_1579191342": formatDateForBitrix(formData.fechaInicio),
                    "UF_CRM_1444014615": formatDateForBitrix(formData.fechaEnvio),
                    "UF_CRM_1443821741": currentFileData.name,
                    "UF_CRM_1444241279": currentFileData.rubrica,
                    "UF_CRM_1579310551": lista_area(productos, "UNAU", 1, listaProductos),
                    "UF_CRM_1579310442": lista_area(productos, "UNAI", 1, listaProductos),
                    "UF_CRM_1579310649": lista_area(productos, "UNVA", 1, listaProductos),
                    "UF_CRM_1672639032": currentFileData.utilidad,
                    "STATUS_ID": "SENT"
                }
            };
        } else {
            const params = {
                ID: numQuote,
                fields: {
                    "UF_CRM_1444241279": currentFileData.rubrica,
                    "UF_CRM_1579310551": lista_area(productos, "UNAU", 1, listaProductos),
                    "UF_CRM_1579310442": lista_area(productos, "UNAI", 1, listaProductos),
                    "UF_CRM_1579310649": lista_area(productos, "UNVA", 1, listaProductos),
                    "UF_CRM_1444015918": lista_area(productos, "serv", 1, listaProductos),
                    "UF_CRM_561405881EE7D": depart_cisac(productos, 1, listaProductos),
                    "UF_CRM_1579702544": depart_cisac(productos, 1, listaProductos).length > 1 ? 1 : 0,
                    "UF_CRM_1579118591": [getEmpleadoId(currentFileData.preparado, empleados)],
                    "UF_CRM_QUOTE_1726248570": [getEmpleadoId(currentFileData.preparado_unva, empleados)],
                    "UF_CRM_QUOTE_1726248646": [getEmpleadoId(currentFileData.preparado_unai, empleados)],
                    "UF_CRM_1444016304": getEmpleadoId(currentFileData.vistoBueno, empleados),
                    "UF_CRM_1672639032": currentFileData.utilidad,
                    "ASSIGNED_BY_ID": getEmpleadoId(currentFileData.responsable, empleados)
                }
            };
            const valorUnidad = unidad_negocio(productos, 1, listaProductos);
            if (valorUnidad.length > 0) {
                params.fields['UF_CRM_1579123526'] = valorUnidad;
            }
            if (currentFileData.costoAuma !== 0) {
                params.fields['UF_CRM_57A0FECB87D98'] = currentFileData.costoAuma;
            }
            if (currentFileData.costoMsa !== 0) {
                params.fields['UF_CRM_1536612809'] = currentFileData.costoMsa;
            }
            if (currentFileData.costoValmet !== 0) {
                params.fields['UF_CRM_1672641073'] = currentFileData.costoValmet;
            }

            if (formData.cambiarFechaCierre && formData.fechaCierre) {
                params.fields['CLOSEDATE'] = formatDateForBitrix(formData.fechaCierre);
            }
            return params;
        }
    };

    const processExcelForDB = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                `${CONFIG.uri}/process-excel-for-db`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error al procesar Excel para DB:', error);
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            const key = Object.keys(errors)[0];
            setErrorMessage(errors[key]);
            return;
        }

        setProcessing(true);
        setErrorMessage('');
        setSuccessMessage('');
        let quoteId = formData.numQuote;
        let historyId = null;

        try {
            const webhook = user.webhook_bitrix;
            const productos = currentFileData.productos.map(p => ({
                PRODUCT_ID: p.productId,
                PRICE: p.precio,
                QUANTITY: p.cantidad,
                TAX_RATE: p.tasa
            }));

            console.log('productos', productos);

            await axios.post(`${webhook}/crm.deal.productrows.set`, {
                ID: currentFileData.numDeal,
                rows: productos
            });

            const dealParams = buildDealPayload();
            console.log('deal', dealParams);
            await axios.post(`${webhook}/crm.deal.update`, dealParams);

            if (createQuote) {
                const dealResponse = await axios.get(`${webhook}/crm.deal.get`, {
                    params: { ID: currentFileData.numDeal }
                });
                const dealData = dealResponse.data.result;
                const quoteParams = buildQuotePayload(dealData);
                const quoteResponse = await axios.post(`${webhook}/crm.quote.add`, quoteParams);
                const newQuoteId = quoteResponse.data.result;
                quoteId = newQuoteId;

                await axios.post(`${webhook}/crm.quote.productrows.set`, {
                    ID: newQuoteId,
                    rows: productos
                });

                setSuccessMessage(`Quote ${newQuoteId} creada exitosamente para ${currentFileData.name} (Deal #${currentFileData.numDeal})`);
            } else {
                const quoteParams = buildQuotePayload(null, formData.numQuote);
                console.log('quote', quoteParams);
                await axios.post(`${webhook}/crm.quote.update`, quoteParams);

                await axios.post(`${webhook}/crm.quote.productrows.set`, {
                    ID: formData.numQuote,
                    rows: productos
                });

                setSuccessMessage(`Quote ${formData.numQuote} actualizada exitosamente para ${currentFileData.name} (Deal #${currentFileData.numDeal})`);
            }

            const totales = calcularTotalesPorArea(currentFileData.productos);
            const historyData = {
                num_deal: currentFileData.numDeal.toString(),
                nombre_oferta: currentFileData.name,
                rubrica: currentFileData.rubrica || null,
                preparado: currentFileData.preparado,
                preparado_unva: currentFileData.preparado_unva || null,
                preparado_unai: currentFileData.preparado_unai || null,
                responsable: currentFileData.responsable,
                visto_bueno: currentFileData.vistoBueno || null,
                usuario_envio: user.email || user.nombre || 'Usuario desconocido',
                usuario_envio_id: user.id || null,
                utilidad: currentFileData.utilidad,
                costo_auma: currentFileData.costoAuma || 0,
                costo_msa: currentFileData.costoMsa || 0,
                costo_valmet: currentFileData.costoValmet || 0,
                total_productos: currentFileData.productos.length,
                tipo_operacion: createQuote ? 'crear' : 'actualizar',
                quote_id: quoteId ? quoteId.toString() : null,
                fecha_correo: createQuote ? formData.fechaCorreo : null,
                fecha_inicio: createQuote ? formData.fechaInicio : null,
                fecha_envio: createQuote ? formData.fechaEnvio : null,
                fecha_cierre: formData.cambiarFechaCierre ? formData.fechaCierre : null,
                fecha_cierre_modificada: formData.cambiarFechaCierre,
                nombre_archivo: files[selectedFileIndex].file.name,
                estado: 'exitoso',
                totales_por_area: totales
            };

            try {
                const historyResponse = await axios.post(`${CONFIG.uri}/history`, historyData);
                historyId = historyResponse.data._id || historyResponse.data.id;
                console.log('Historial guardado con ID:', historyId);
            } catch (historyError) {
                console.error('Error al guardar en historial:', historyError);
            }

            // NUEVO: Procesar y guardar Excel en la base de datos
            if (historyId) {
                try {
                    const excelProcessed = await processExcelForDB(files[selectedFileIndex].file);

                    if (excelProcessed && excelProcessed.success) {
                        const processedExcelData = {
                            history_id: historyId,
                            num_deal: currentFileData.numDeal.toString(),
                            num_oferta: excelProcessed.num_oferta || '',
                            revision: excelProcessed.revision || '',
                            cliente: excelProcessed.cliente || '',
                            nombre_archivo: files[selectedFileIndex].file.name,
                            productos: excelProcessed.productos || [],
                            total_productos: excelProcessed.total_productos || 0,
                            resumen_estadistico: excelProcessed.resumen_estadistico || null
                        };

                        await axios.post(`${CONFIG.uri}/processed-excels`, processedExcelData);
                        console.log('Excel procesado guardado exitosamente');
                    }
                } catch (excelError) {
                    console.error('Error al procesar Excel para DB:', excelError);
                    // No detener el flujo si falla el guardado del Excel
                }
            }

            const updatedFiles = [...files];
            updatedFiles[selectedFileIndex].status = 'success';
            setFiles(updatedFiles);

            setTimeout(() => {
                const nextIndex = selectedFileIndex + 1;
                if (nextIndex < files.length) {
                    handleSelectFile(nextIndex);
                } else {
                    setSelectedFileIndex(null);
                    setCurrentFileData(null);
                }
            }, 1000);

        } catch (error) {
            const errorMsg = error.response?.data?.error_description || error.message;
            setErrorMessage('Error al enviar datos a Bitrix24: ' + errorMsg);

            try {
                const totales = calcularTotalesPorArea(currentFileData.productos);
                const historyData = {
                    num_deal: currentFileData.numDeal.toString(),
                    nombre_oferta: currentFileData.name,
                    rubrica: currentFileData.rubrica || null,
                    preparado: currentFileData.preparado,
                    preparado_unva: currentFileData.preparado_unva || null,
                    preparado_unai: currentFileData.preparado_unai || null,
                    responsable: currentFileData.responsable,
                    visto_bueno: currentFileData.vistoBueno || null,
                    usuario_envio: user.email || user.nombre || 'Usuario desconocido',
                    usuario_envio_id: user.id || null,
                    utilidad: currentFileData.utilidad,
                    costo_auma: currentFileData.costoAuma || 0,
                    costo_msa: currentFileData.costoMsa || 0,
                    costo_valmet: currentFileData.costoValmet || 0,
                    total_productos: currentFileData.productos.length,
                    tipo_operacion: createQuote ? 'crear' : 'actualizar',
                    quote_id: quoteId ? quoteId.toString() : null,
                    fecha_correo: createQuote ? formData.fechaCorreo : null,
                    fecha_inicio: createQuote ? formData.fechaInicio : null,
                    fecha_envio: createQuote ? formData.fechaEnvio : null,
                    fecha_cierre: formData.cambiarFechaCierre ? formData.fechaCierre : null,
                    fecha_cierre_modificada: formData.cambiarFechaCierre,
                    nombre_archivo: files[selectedFileIndex].file.name,
                    estado: 'error',
                    error_mensaje: errorMsg,
                    totales_por_area: totales
                };
                await axios.post(`${CONFIG.uri}/history`, historyData);
            } catch (historyError) {
                console.error('Error al guardar en historial:', historyError);
                console.error('Response data:', historyError.response?.data);
            }

            const updatedFiles = [...files];
            updatedFiles[selectedFileIndex].status = 'error';
            updatedFiles[selectedFileIndex].error = error.message;
            setFiles(updatedFiles);
        } finally {
            setProcessing(false);
        }
    };

    const fetchQuotes = async (dealId) => {
        try {
            const response = await axios.get(
                `${user.webhook_bitrix}/crm.quote.list`,
                {
                    params: {
                        "select[0]": "UF_CRM_1443821741",
                        "filter[DEAL_ID]": dealId
                    }
                }
            );
            const data = response.data.result;
            let quoteExists = false;
            let existingQuoteId = '';

            for (const item of data) {
                if (item['UF_CRM_1443821741'] === currentFileData.name) {
                    quoteExists = true;
                    existingQuoteId = item['ID'];
                    break;
                }
            }

            setCreateQuote(!quoteExists);
            if (quoteExists) {
                setFormData(prev => ({ ...prev, numQuote: existingQuoteId }));
            }
        } catch (error) {
            console.error("Error al obtener quotes:", error);
            setCreateQuote(true);
        }
    };

    useEffect(() => {
        if (currentFileData && currentFileData.numDeal) {
            fetchQuotes(currentFileData.numDeal);
        }
    }, [currentFileData, formData.webhook]);

    const renderProductTable = () => {
        if (!currentFileData || !currentFileData.productos) return null;

        const totales = calcularTotalesPorArea(currentFileData.productos);

        return (
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ bgcolor: fioriColors.primary, color: 'white', fontWeight: 'bold' }}>
                                ID
                            </TableCell>
                            <TableCell sx={{ bgcolor: fioriColors.primary, color: 'white', fontWeight: 'bold' }}>
                                Nombre
                            </TableCell>
                            <TableCell align="right" sx={{ bgcolor: fioriColors.primary, color: 'white', fontWeight: 'bold' }}>
                                Precio
                            </TableCell>
                            <TableCell align="right" sx={{ bgcolor: fioriColors.primary, color: 'white', fontWeight: 'bold' }}>
                                Cantidad
                            </TableCell>
                            <TableCell align="right" sx={{ bgcolor: fioriColors.primary, color: 'white', fontWeight: 'bold' }}>
                                Tasa
                            </TableCell>
                            <TableCell sx={{ bgcolor: fioriColors.primary, color: 'white', fontWeight: 'bold' }}>
                                Área
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {currentFileData.productos.map((producto, index) => (
                            <TableRow key={index} hover>
                                <TableCell>{producto.productId}</TableCell>
                                <TableCell>{producto.nombre}</TableCell>
                                <TableCell align="right">${producto.precio ? numeral(producto.precio).format('0,0.00') : ''}</TableCell>
                                <TableCell align="right">{producto.cantidad}</TableCell>
                                <TableCell align="right">{producto.tasa}%</TableCell>
                                <TableCell>
                                    <Chip
                                        label={producto.unidadNegocio}
                                        size="small"
                                        color={
                                            producto.unidadNegocio === 'UNAU' ? 'primary' :
                                                producto.unidadNegocio === 'UNAI' ? 'secondary' :
                                                    producto.unidadNegocio === 'UNVA' ? 'success' : 'default'
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell colSpan={6}>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Totales por Área:
                                    </Typography>
                                    <Grid container spacing={1}>
                                        {Object.entries(totales).map(([area, total]) => (
                                            total > 0 && (
                                                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={area}>
                                                    <Paper sx={{ p: 1, textAlign: 'center', bgcolor: fioriColors.background }}>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {area}
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            ${total ? numeral(total).format('0,0.00') : ''}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            )
                                        ))}
                                    </Grid>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Box sx={{ bgcolor: fioriColors.background, minHeight: '100vh', py: 3 }}>
            <Container maxWidth="xl">
                {successMessage && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
                        {successMessage}
                    </Alert>
                )}

                {errorMessage && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
                        {errorMessage}
                    </Alert>
                )}

                {!listaProductos || !empleados && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress />
                    </Box>
                )}

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Card elevation={0} sx={{ borderRadius: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ color: fioriColors.primary }}>
                                    Archivos
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Button
                                    component="label"
                                    variant="contained"
                                    startIcon={<CloudUpload />}
                                    fullWidth
                                    sx={{
                                        mb: 2,
                                        bgcolor: fioriColors.primary,
                                        '&:hover': { bgcolor: '#0060D1' },
                                        textTransform: 'none'
                                    }}
                                >
                                    Subir Archivos
                                    <input
                                        type="file"
                                        hidden
                                        multiple
                                        accept=".xlsx,.xls,.xlsm,.xltm"
                                        onChange={handleFileUpload}
                                    />
                                </Button>

                                {loading && <LinearProgress sx={{ mb: 2 }} />}

                                <List dense>
                                    {files.map((fileObj, index) => (
                                        <ListItem
                                            key={fileObj.id}
                                            sx={{
                                                bgcolor: selectedFileIndex === index ? fioriColors.background : 'transparent',
                                                borderRadius: 1,
                                                mb: 0.5,
                                                cursor: 'pointer',
                                                border: selectedFileIndex === index ? `2px solid ${fioriColors.primary}` : '1px solid #E0E0E0',
                                                '&:hover': { bgcolor: fioriColors.background }
                                            }}
                                            onClick={() => handleSelectFile(index)}
                                            secondaryAction={
                                                <Stack direction="row" spacing={0.5}>
                                                    {fileObj.status === 'success' && (
                                                        <CheckCircle fontSize="small" sx={{ color: fioriColors.success }} />
                                                    )}
                                                    {fileObj.status === 'error' && (
                                                        <Warning fontSize="small" sx={{ color: fioriColors.error }} />
                                                    )}
                                                    <IconButton
                                                        edge="end"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteFile(index);
                                                        }}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            }
                                        >
                                            <InsertDriveFile fontSize="small" sx={{ mr: 1, color: fioriColors.primary }} />
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" noWrap>
                                                        {fileObj.file.name}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="textSecondary">
                                                        {fileObj.status === 'pending' ? 'Pendiente' :
                                                            fileObj.status === 'success' ? 'Procesado' :
                                                                fileObj.status === 'error' ? 'Error' : 'Listo'}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                    {files.length === 0 && (
                                        <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ py: 2 }}>
                                            No hay archivos cargados
                                        </Typography>
                                    )}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 9 }}>
                        {currentFileData ? (
                            <Stack spacing={3}>
                                <Card elevation={0} sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: fioriColors.primary }}>
                                            <Info sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                                            Información del Deal
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Número de Deal
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ color: fioriColors.primary }}>
                                                        {currentFileData.numDeal || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Nombre de la oferta
                                                    </Typography>
                                                    <Typography variant="body1" fontWeight="bold">
                                                        {currentFileData.name || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Preparado {currentFileData.preparado_unva && currentFileData.preparado_unai ? 'UNAU' : ''}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Preparado UNVA
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_unva || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Preparado UNAI
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_unai || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Responsable
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Visto Bueno
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.vistoBueno || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Utilidad
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {currentFileData.utilidad ? `${(currentFileData.utilidad * 100).toFixed(2)}%` : 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Códigos
                                                    </Typography>
                                                    <Typography variant="body2" noWrap>
                                                        {currentFileData.rubrica || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                <Card elevation={0} sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: fioriColors.primary }}>
                                            <Description sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                                            Productos ({currentFileData.productos?.length || 0})
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        {renderProductTable()}
                                    </CardContent>
                                </Card>

                                <Card elevation={0} sx={{ borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: fioriColors.primary }}>
                                            Configuración de Envío
                                        </Typography>
                                        <Divider sx={{ mb: 3 }} />

                                        <Grid container spacing={3}>
                                            <Grid size={{ xs: 12 }}>
                                                <Paper sx={{ p: 2, bgcolor: fioriColors.background }}>
                                                    <Typography variant="subtitle2" gutterBottom>
                                                        Estado del Quote
                                                    </Typography>
                                                    <Chip
                                                        label={createQuote ? 'Crear nueva Quote' : 'Actualizar Quote existente'}
                                                        color={createQuote ? 'success' : 'primary'}
                                                        icon={createQuote ? <CheckCircle /> : <Info />}
                                                    />
                                                    {!createQuote && (
                                                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                                            Quote ID: {formData.numQuote}
                                                        </Typography>
                                                    )}
                                                </Paper>
                                            </Grid>

                                            <Grid size={{ xs: 12 }}>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={formData.cambiarFechaCierre}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                cambiarFechaCierre: e.target.checked
                                                            })}
                                                        />
                                                    }
                                                    label={`¿Desea cambiar fecha de cierre para ${currentFileData.name}?`}
                                                />
                                            </Grid>

                                            {formData.cambiarFechaCierre && (
                                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                    <TextField
                                                        fullWidth
                                                        label="Nueva Fecha Cierre"
                                                        type="date"
                                                        value={formData.fechaCierre}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            fechaCierre: e.target.value
                                                        })}
                                                        error={!!errors.fechaCierre}
                                                        helperText={errors.fechaCierre || 'Formato: YYYY-MM-DD'}
                                                        size="small"
                                                        InputLabelProps={{ shrink: true }}
                                                    />
                                                </Grid>
                                            )}

                                            {createQuote && (
                                                <>
                                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                        <TextField
                                                            fullWidth
                                                            label="Fecha Correo"
                                                            type="date"
                                                            value={formData.fechaCorreo}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                fechaCorreo: e.target.value
                                                            })}
                                                            error={!!errors.fechaCorreo}
                                                            helperText={errors.fechaCorreo || 'Formato: YYYY-MM-DD'}
                                                            required
                                                            size="small"
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                        <TextField
                                                            fullWidth
                                                            label="Fecha Inicio"
                                                            type="date"
                                                            value={formData.fechaInicio}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                fechaInicio: e.target.value
                                                            })}
                                                            error={!!errors.fechaInicio}
                                                            helperText={errors.fechaInicio || 'Formato: YYYY-MM-DD'}
                                                            required
                                                            size="small"
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                        <TextField
                                                            fullWidth
                                                            label="Fecha Envío"
                                                            type="date"
                                                            value={formData.fechaEnvio}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                fechaEnvio: e.target.value
                                                            })}
                                                            error={!!errors.fechaEnvio}
                                                            helperText={errors.fechaEnvio || 'Formato: YYYY-MM-DD'}
                                                            required
                                                            size="small"
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                    </Grid>
                                                </>
                                            )}
                                        </Grid>

                                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                            <Button
                                                variant="outlined"
                                                onClick={() => {
                                                    setSelectedFileIndex(null);
                                                    setCurrentFileData(null);
                                                }}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                variant="contained"
                                                startIcon={processing ? null : <Send />}
                                                onClick={handleSubmit}
                                                disabled={processing}
                                                sx={{
                                                    bgcolor: fioriColors.primary,
                                                    '&:hover': { bgcolor: '#0060D1' },
                                                    textTransform: 'none'
                                                }}
                                            >
                                                {processing ? 'Enviando...' : createQuote ? 'Crear Quote' : 'Actualizar Quote'}
                                            </Button>
                                        </Box>

                                        {processing && <LinearProgress sx={{ mt: 2 }} />}
                                    </CardContent>
                                </Card>
                            </Stack>
                        ) : (
                            <Card elevation={0} sx={{ borderRadius: 2, textAlign: 'center', py: 8 }}>
                                <CardContent>
                                    <CloudUpload sx={{ fontSize: 80, color: fioriColors.secondary, mb: 2 }} />
                                    <Typography variant="h6" color="textSecondary" gutterBottom>
                                        No hay archivo seleccionado
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Sube archivos Excel o selecciona uno del panel lateral
                                    </Typography>
                                </CardContent>
                            </Card>
                        )}
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};