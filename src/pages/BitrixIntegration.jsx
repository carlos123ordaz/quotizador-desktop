import { useState, useCallback, useEffect, useContext } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
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
    CircularProgress,
    Tooltip,
    useTheme,
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
import { readFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import moment from 'moment';

export const BitrixIntegration = () => {
    const theme = useTheme();
    const [files, setFiles] = useState([]);
    const [selectedFileIndex, setSelectedFileIndex] = useState(null);
    const [currentFileData, setCurrentFileData] = useState(null);
    const [listaProductos, setListaProductos] = useState(null)
    const [empleados, setEmpleados] = useState(null);
    const [loading, setLoading] = useState(false);
    const [createQuote, setCreateQuote] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { user } = useContext(MainContext);
    const [dealData, setDealData] = useState(null);
    const [formData, setFormData] = useState({
        crearQuote: false,
        numQuote: '',
        fechaCorreo: moment().format('YYYY-MM-DD'),
        fechaInicio: moment().format('YYYY-MM-DD'),
        fechaEnvio: moment().format('YYYY-MM-DD'),
        fechaCierre: moment().format('YYYY-MM-DD'),
        cambiarFechaCierre: false,
        codeMaterial: ''
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loadingDealData, setLoadingDealData] = useState(false);
    const handleDroppedFiles = useCallback(async (filePaths) => {
        if (!listaProductos || Object.keys(listaProductos).length === 0) {
            setErrorMessage('Los productos aún no se han cargado. Por favor, espera un momento e intenta de nuevo.');
            return;
        }

        if (!empleados || Object.keys(empleados).length === 0) {
            setErrorMessage('Los vendedores aún no se han cargado. Por favor, espera un momento e intenta de nuevo.');
            return;
        }
        setLoading(true);
        setErrorMessage('');
        try {
            const processedFiles = await Promise.all(
                filePaths.map(async (filePath) => {
                    try {
                        const fileBuffer = await readFile(filePath);
                        const fileName = filePath.split(/[\\/]/).pop();
                        const blob = new Blob([fileBuffer], {
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });
                        const file = new File([blob], fileName, {
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });

                        const data = await processExcelFile(file, listaProductos);
                        return {
                            file,
                            data,
                            status: 'pending',
                            id: Math.random().toString(36).substr(2, 9)
                        };
                    } catch (error) {
                        console.error('❌ Error:', error);
                        const fileName = filePath.split(/[\\/]/).pop();
                        return {
                            file: { name: fileName },
                            data: null,
                            status: 'error',
                            error: error.message,
                            id: Math.random().toString(36).substr(2, 9)
                        };
                    }
                })
            );
            setFiles((prev) => [...prev, ...processedFiles]);
            const length = processedFiles.length;
            if (length > 0 && selectedFileIndex === null) {
                setSelectedFileIndex(length - 1);
                console.log(processedFiles[length - 1].data)
                setCurrentFileData(processedFiles[length - 1].data);
            }
        } catch (error) {
            console.error(error)
            setErrorMessage('Error al procesar archivos: ' + error.message);
        } finally {
            setLoading(false);
        }

    }, [listaProductos, selectedFileIndex]);

    useEffect(() => {
        let unlistenFn;
        let isSubscribed = true;
        const setupDragDrop = async () => {
            const appWindow = getCurrentWebviewWindow();
            const unlisten = await appWindow.onDragDropEvent(async (event) => {
                if (!isSubscribed) return;
                if (event.payload.type === 'drop') {
                    const paths = event.payload.paths;
                    await handleDroppedFiles(paths);
                }
            });
            return unlisten;
        };

        setupDragDrop().then(fn => {
            if (isSubscribed) {
                unlistenFn = fn;
            } else {
                fn();
            }
        }).catch(err => {
            console.error('❌ Error en setup:', err);
        });

        return () => {
            isSubscribed = false;
            if (unlistenFn) {
                unlistenFn();
            }
        };
    }, [handleDroppedFiles]);

    const handleFileUpload = async (event) => {
        if (!listaProductos || Object.keys(listaProductos).length === 0) {
            setErrorMessage('Los productos aún no se han cargado. Por favor, espera un momento e intenta de nuevo.');
            return;
        }
        if (!empleados || Object.keys(empleados).length === 0) {
            setErrorMessage('Los empleados aún no se han cargado. Por favor, espera un momento e intenta de nuevo.');
            return;
        }

        const uploadedFiles = Array.from(event.target.files);
        if (uploadedFiles.length === 0) {
            setErrorMessage('No se seleccionaron archivos');
            return;
        }
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
                        console.log(error)
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
            const length = processedFiles.length
            if (length > 0 && selectedFileIndex === null) {
                setSelectedFileIndex(length - 1);
                setCurrentFileData(processedFiles[length - 1].data);
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
            setErrorMessage('Error al obtener vendedores: ' + error.message);
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
            fechaCorreo: moment().format('YYYY-MM-DD'),
            fechaInicio: moment().format('YYYY-MM-DD'),
            fechaEnvio: moment().format('YYYY-MM-DD'),
            fechaCierre: moment().format('YYYY-MM-DD'),
            cambiarFechaCierre: false,
            codeMaterial: '',
        });
        setErrors({});
    };

    const handleDeleteFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);

        if (index === selectedFileIndex) {
            if (newFiles.length > 0) {
                const newIndex = newFiles.length - 1;
                setSelectedFileIndex(newIndex);
                setCurrentFileData(newFiles[newIndex].data);
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
            newErrors.preparado = 'Vendedor no encontrado, la persona tiene que estar registrado en el Bitrix y el Quotizador';
        }
        setErrors(newErrors);
        return newErrors;
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
                "ASSIGNED_BY_ID": getEmpleadoId(currentFileData.responsable, empleados),
                "PROBABILITY": dealData['PROBABILITY'],
                "UF_CRM_5716A1B6E160D": currentFileData.name,
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

    const buildQuotePayload = (_dealData, numQuote = null, codeMaterial = null) => {
        const productos = currentFileData.productos.map(p => ({
            PRODUCT_ID: p.productId,
            PRICE: p.precio,
            QUANTITY: p.cantidad,
            TAX_RATE: p.tasa
        }));
        const procedencia = { '1261': 1265, '1701': 1705, '1263': 1165 };
        const pic = { '3898': '3910', '3900': '3912', '3902': '3914' };
        const pau = { '3904': '3916', '3906': '3918', '3908': '3920' };
        if (createQuote && _dealData) {
            return {
                fields: {
                    "TITLE": _dealData['TITLE'],
                    "CURRENCY_ID": _dealData['CURRENCY_ID'],
                    "DEAL_ID": currentFileData.numDeal,
                    "COMPANY_ID": _dealData['COMPANY_ID'],
                    "CONTACT_ID": _dealData['CONTACT_ID'],
                    "BEGINDATE": _dealData['BEGINDATE'],
                    "CLOSEDATE": _dealData['CLOSEDATE'],
                    "ASSIGNED_BY_ID": _dealData['ASSIGNED_BY_ID'],
                    "UTM_SOURCE": _dealData['UTM_SOURCE'],
                    "UTM_MEDIUM": _dealData['UTM_MEDIUM'],
                    "UTM_CAMPAIGN": _dealData['UTM_CAMPAIGN'],
                    "UTM_CONTENT": _dealData['UTM_CONTENT'],
                    "UTM_TERM": _dealData['UTM_TERM'],
                    "LEAD_ID": _dealData['LEAD_ID'],
                    "UF_CRM_1672643073": _dealData['UF_CRM_1672642957'],
                    "UF_CRM_1672643100": _dealData['UF_CRM_1672643001'],
                    "UF_CRM_1672643342": _dealData['UF_CRM_1672643298'],
                    "UF_CRM_62AB9AAFA8FE1": _dealData['UF_CRM_1655413285'],
                    "UF_CRM_1579190330": _dealData['UF_CRM_1579190263'],
                    "UF_CRM_5611E9B1B1870": parseInt(_dealData['UF_CRM_5716A1B70005A']) - 169,
                    "UF_CRM_5611E9B1C3BD5": _dealData['UF_CRM_5716A1B709633'],
                    "UF_CRM_5B43D5CD2195D": Array.isArray(_dealData['UF_CRM_1531171994'])
                        ? _dealData['UF_CRM_1531171994'].map(x =>
                            procedencia[String(x)] || (parseInt(x) > 1200 ? parseInt(x) + 2 : parseInt(x) + 40)
                        )
                        : _dealData['UF_CRM_1531171994'],
                    "UF_CRM_5611E9B18B540": Array.isArray(_dealData['UF_CRM_5716A1B6EA8CF'])
                        ? _dealData['UF_CRM_5716A1B6EA8CF'].map(x => parseInt(x) - 169)
                        : _dealData['UF_CRM_5716A1B6EA8CF'],
                    "UF_CRM_1579123526": Array.isArray(_dealData['UF_CRM_1579123522'])
                        ? _dealData['UF_CRM_1579123522'].map(x => parseInt(x) + 6)
                        : _dealData['UF_CRM_1579123522'],
                    "UF_CRM_599F061D53C4B": parseInt(_dealData['UF_CRM_1503584748']) + 32,
                    "UF_CRM_561405881EE7D": Array.isArray(_dealData['UF_CRM_1444152618'])
                        ? _dealData['UF_CRM_1444152618'].map(x =>
                            parseInt(x) === 2087 ? parseInt(x) + 2 : parseInt(x) + 6
                        )
                        : _dealData['UF_CRM_1444152618'],
                    "UF_CRM_1444015918": Array.isArray(_dealData['UF_CRM_5716A1B71750E'])
                        ? _dealData['UF_CRM_5716A1B71750E'].map(x => {
                            const val = parseInt(x);
                            if (val === 2095) return val + 2;
                            if (val > 2000) return val + 8;
                            if (val === 530 || val === 532) return val - 167;
                            return val - 169;
                        })
                        : _dealData['UF_CRM_5716A1B71750E'],
                    "UF_CRM_5611F0F434963": _dealData['UF_CRM_1444016101'],
                    "UF_CRM_1579118591": [getEmpleadoId(currentFileData.preparado, empleados)],
                    "UF_CRM_69CC5489DF950": [getEmpleadoId(currentFileData.preparado_unau, empleados)],
                    "UF_CRM_QUOTE_1726248570": [getEmpleadoId(currentFileData.preparado_unva, empleados)],
                    "UF_CRM_QUOTE_1726248646": [getEmpleadoId(currentFileData.preparado_unai, empleados)],
                    "UF_CRM_69CC5489ECC22": [getEmpleadoId(currentFileData.preparado_unap, empleados)],
                    "UF_CRM_69CC548A02C33": [getEmpleadoId(currentFileData.preparado_unepc, empleados)],
                    "UF_CRM_69CD86482EEB2": [getEmpleadoId(currentFileData.preparado_pau, empleados)],
                    "UF_CRM_69CD5C83086F1": [getEmpleadoId(currentFileData.preparado_pic, empleados)],
                    "UF_CRM_661D9628B88E4": [getEmpleadoId(currentFileData.responsable_unau, empleados)],
                    "UF_CRM_661D9628DD97E": [getEmpleadoId(currentFileData.responsable_unva, empleados)],
                    "UF_CRM_661D9628CF319": [getEmpleadoId(currentFileData.responsable_unai, empleados)],
                    "UF_CRM_69C4DC33529E5": [getEmpleadoId(currentFileData.responsable_unap, empleados)],
                    "UF_CRM_69CA73C54931F": [getEmpleadoId(currentFileData.responsable_unepc, empleados)],
                    "UF_CRM_69CD864823A5E": [getEmpleadoId(currentFileData.responsable_pau, empleados)],
                    "UF_CRM_69CD5C82DD531": [getEmpleadoId(currentFileData.responsable_pic, empleados)],
                    "UF_CRM_1444016304": getEmpleadoId(currentFileData.vistoBueno, empleados),
                    "UF_CRM_5F2A353D3EE36": _dealData['UF_CRM_1596601522'],
                    "UF_CRM_1579702544": _dealData['UF_CRM_1579702489'],
                    "UF_CRM_5ABA80EAD4C53": _dealData['UF_CRM_1522157323'],
                    "UF_CRM_57A0FECB87D98": _dealData['UF_CRM_1470168697'],
                    "UF_CRM_1536612809": _dealData['UF_CRM_1536612671'],
                    "UF_CRM_1672641073": _dealData['UF_CRM_1672640891'],
                    "UF_CRM_1579310925": formatDateForBitrix(formData.fechaCorreo),
                    "UF_CRM_1579191342": formatDateForBitrix(formData.fechaInicio),
                    "UF_CRM_1444014615": formatDateForBitrix(formData.fechaEnvio),
                    "UF_CRM_1443821741": currentFileData.name,
                    "UF_CRM_1444241279": currentFileData.rubrica,
                    "UF_CRM_1579310551": lista_area(productos, "UNAU", 1, listaProductos),
                    "UF_CRM_1579310442": lista_area(productos, "UNAI", 1, listaProductos),
                    "UF_CRM_1579310649": lista_area(productos, "UNVA", 1, listaProductos),
                    "UF_CRM_1672639032": currentFileData.utilidad,
                    "STATUS_ID": "SENT",
                    "UF_CRM_6633E91D6E277": pic[dealData['UF_CRM_1714677510']],
                    "UF_CRM_6633E91D8FD22": pau[dealData['UF_CRM_1714677550']],
                    "UF_CRM_QUOTE_1740087074371": productos?.length || 0,
                    "UF_CRM_QUOTE_1740087091949": codeMaterial ? codeMaterial : 'NO APLICA',
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
                    "UF_CRM_69CC5489DF950": [getEmpleadoId(currentFileData.preparado_unau, empleados)],
                    "UF_CRM_QUOTE_1726248570": [getEmpleadoId(currentFileData.preparado_unva, empleados)],
                    "UF_CRM_QUOTE_1726248646": [getEmpleadoId(currentFileData.preparado_unai, empleados)],
                    "UF_CRM_69CC5489ECC22": [getEmpleadoId(currentFileData.preparado_unap, empleados)],
                    "UF_CRM_69CC548A02C33": [getEmpleadoId(currentFileData.preparado_unepc, empleados)],
                    "UF_CRM_69CD86482EEB2": [getEmpleadoId(currentFileData.preparado_pau, empleados)],
                    "UF_CRM_69CD5C83086F1": [getEmpleadoId(currentFileData.preparado_pic, empleados)],
                    "UF_CRM_661D9628B88E4": [getEmpleadoId(currentFileData.responsable_unau, empleados)],
                    "UF_CRM_661D9628DD97E": [getEmpleadoId(currentFileData.responsable_unva, empleados)],
                    "UF_CRM_661D9628CF319": [getEmpleadoId(currentFileData.responsable_unai, empleados)],
                    "UF_CRM_69C4DC33529E5": [getEmpleadoId(currentFileData.responsable_unap, empleados)],
                    "UF_CRM_69CA73C54931F": [getEmpleadoId(currentFileData.responsable_unepc, empleados)],
                    "UF_CRM_69CD864823A5E": [getEmpleadoId(currentFileData.responsable_pau, empleados)],
                    "UF_CRM_69CD5C82DD531": [getEmpleadoId(currentFileData.responsable_pic, empleados)],
                    "UF_CRM_1444016304": getEmpleadoId(currentFileData.vistoBueno, empleados),
                    "UF_CRM_1672639032": currentFileData.utilidad,
                    "ASSIGNED_BY_ID": getEmpleadoId(currentFileData.responsable, empleados),
                    "UF_CRM_6633E91D6E277": pic[dealData['UF_CRM_1714677510']],
                    "UF_CRM_6633E91D8FD22": pau[dealData['UF_CRM_1714677550']],
                    "UF_CRM_QUOTE_1740087074371": productos?.length || 0,
                    "UF_CRM_QUOTE_1740087091949": codeMaterial ? codeMaterial : 'NO APLICA',
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

    const getDealData = async () => {
        try {
            setDealData(null);
            setLoadingDealData(true);
            const webhook = user.webhook_bitrix;
            const dealResponse = await axios.get(`${webhook}/crm.deal.get`, {
                params: { ID: currentFileData.numDeal }
            });
            setDealData(dealResponse.data.result);
        } catch (error) {
            if (error.response?.data?.error_description) {
                setErrorMessage(error.response.data.error_description);
                return;
            }
            setErrorMessage('No se pudo encontrar la deal');
            console.error('Error al obtener datos del deal:', error);
        } finally {
            setLoadingDealData(false);
        }
    }

    useEffect(() => {
        if (currentFileData) {
            getDealData();
        }
    }, [currentFileData]);

    const handleSubmit = async () => {
        if (!currentFileData?.productos || currentFileData.productos.length === 0) {
            setErrorMessage('No hay productos para enviar');
            return;
        }
        if (loadingDealData) {
            setErrorMessage('Espera a que se cargue la información del deal');
            return;
        }
        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            const key = Object.keys(formErrors)[0];
            setErrorMessage(formErrors[key]);
            return;
        }
        if (!dealData) {
            setErrorMessage('No se pudo obtener información del deal. Por favor, intenta de nuevo.');
            return;
        }
        if (Number(dealData['PROBABILITY']) <= 0) {
            setErrorMessage('La probabilidad del deal debe ser mayor a 0.');
            return;
        }
        if (!dealData || !dealData['TITLE']) {
            setErrorMessage('No se encontró la deal');
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
            await axios.post(`${webhook}/crm.deal.productrows.set`, {
                ID: currentFileData.numDeal,
                rows: productos
            });

            const dealParams = buildDealPayload();
            await axios.post(`${webhook}/crm.deal.update`, dealParams);
            return;
            if (createQuote) {
                const quoteParams = buildQuotePayload(dealData, null, formData.codeMaterial);
                const quoteResponse = await axios.post(`${webhook}/crm.quote.add`, quoteParams);
                const newQuoteId = quoteResponse.data.result;
                quoteId = newQuoteId;

                await axios.post(`${webhook}/crm.quote.productrows.set`, {
                    ID: newQuoteId,
                    rows: productos
                });

                setSuccessMessage(`Quote ${newQuoteId} creada exitosamente para ${currentFileData.name} (Deal #${currentFileData.numDeal})`);
            } else {
                const quoteParams = buildQuotePayload(null, formData.numQuote, formData.codeMaterial);
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
                preparado_unepc: currentFileData.preparado_unepc || null,
                preparado_unap: currentFileData.preparado_unap || null,
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
            } catch (historyError) {
                console.error('Error al guardar en historial:', historyError);
            }
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
                    }
                } catch (excelError) {
                    console.error('Error al procesar Excel para DB:', excelError);
                }
            }

            const updatedFiles = [...files];
            updatedFiles[selectedFileIndex].status = 'success';
            setFiles(updatedFiles);

            setTimeout(() => {
                const nextIndex = selectedFileIndex - 1;
                if (nextIndex >= 0) {
                    handleSelectFile(nextIndex);
                } else {
                    setSelectedFileIndex(null);
                    setCurrentFileData(null);
                }
            }, 1000);

        } catch (error) {
            return;
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
                    preparado_unepc: currentFileData.preparado_unepc || null,
                    preparado_unap: currentFileData.preparado_unap || null,
                    responsable: currentFileData.responsable,
                    visto_bueno: currentFileData.vistoBueno || null,
                    usuario_envio: `${user.nombre} ${user.apellido}`,
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
                        "select[1]": "UF_CRM_QUOTE_1740087091949",
                        "filter[DEAL_ID]": dealId
                    }
                }
            );
            const data = response.data.result;
            let quoteExists = false;
            let existingQuoteId = '';
            let material = ''
            for (const item of data) {
                if (item['UF_CRM_1443821741'] === currentFileData.name) {
                    quoteExists = true;
                    existingQuoteId = item['ID'];
                    material = item['UF_CRM_QUOTE_1740087091949'] || '';
                    break;
                }
            }
            setCreateQuote(!quoteExists);
            if (quoteExists) {
                setFormData(prev => ({ ...prev, numQuote: existingQuoteId, codeMaterial: material }));
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
    }, [currentFileData]);


    if (!listaProductos || !empleados) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    gap: 2
                }}
            >
                <CircularProgress size={30} />
                <Typography variant="h6" color="text.secondary">
                    Cargando datos...
                </Typography>
            </Box>
        );
    }
    const renderProductTable = () => {
        if (!currentFileData || !currentFileData.productos) return null;

        const totales = calcularTotalesPorArea(currentFileData.productos);

        return (
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                                ID
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                                Nombre
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                                Precio
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                                Área
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {currentFileData.productos.map((producto, index) => (
                            <TableRow key={index} hover>
                                <TableCell>{producto.productId}</TableCell>
                                <TableCell>{producto.nombre}</TableCell>
                                <TableCell>${producto.precio ? numeral(producto.precio).format('0,0.00') : ''}</TableCell>
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
                                                    <Paper sx={{
                                                        p: 1,
                                                        textAlign: 'center',
                                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                    }}>
                                                        <Typography variant="caption" color="text.secondary">
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
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 3 }}>
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
                        <Card elevation={0} sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
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
                                                bgcolor: selectedFileIndex === index
                                                    ? (theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.08)' : '#F5F5F5')
                                                    : 'transparent',
                                                borderRadius: 1,
                                                mb: 0.5,
                                                cursor: 'pointer',
                                                border: selectedFileIndex === index ? 2 : 1,
                                                borderColor: selectedFileIndex === index ? 'primary.main' : 'divider',
                                                '&:hover': {
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }
                                            }}
                                            onClick={() => handleSelectFile(index)}
                                            secondaryAction={
                                                <Stack direction="row" spacing={0.5}>
                                                    {fileObj.status === 'success' && (
                                                        <CheckCircle fontSize="small" sx={{ color: 'success.main' }} />
                                                    )}
                                                    {fileObj.status === 'error' && (
                                                        <Warning fontSize="small" sx={{ color: 'error.main' }} />
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
                                            <InsertDriveFile fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" noWrap>
                                                        {fileObj.file.name}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary">
                                                        {fileObj.status === 'pending' ? 'Pendiente' :
                                                            fileObj.status === 'success' ? 'Procesado' :
                                                                fileObj.status === 'error' ? 'Error' : 'Listo'}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                    {files.length === 0 && (
                                        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                                            No hay archivos cargados
                                        </Typography>
                                    )}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 9 }}>
                        {currentFileData ? (
                            <Stack spacing={2}>
                                <Card elevation={0} sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                                            <Info sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                                            Información del Deal
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Número de Deal
                                                    </Typography>
                                                    <Typography noWrap variant="body1" sx={{ color: 'primary.main' }}>
                                                        {!loadingDealData ? (currentFileData.numDeal || 'N/A') : 'Cargando..'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Nombre de la oferta
                                                    </Typography>
                                                    <Typography noWrap variant="body1" fontWeight="bold">
                                                        {currentFileData.name || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado UNAU
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_unau || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado UNAI
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_unai || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado UNVA
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_unva || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado UNAI
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_unai || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado UNAP
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_unap || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado UNEPC
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_unepc || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado PIC
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_pic || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Preparado PAU
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.preparado_pau || '-'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Responsable
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Responsable UNAU
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable_unau || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Responsable UNVA
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable_unva || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Responsable UNAI
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable_unai || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Responsable UNAP
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable_unap || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Responsable UNEPC
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable_unepc || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Responsable PIC
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable_pic || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Responsable PAU
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.responsable_pau || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Visto Bueno
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {currentFileData.vistoBueno || 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>

                                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Utilidad
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {currentFileData.utilidad ? `${(currentFileData.utilidad * 100).toFixed(2)}%` : 'N/A'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Códigos
                                                    </Typography>
                                                    <Tooltip title={currentFileData.rubrica || 'N/A'} arrow>
                                                        <Typography
                                                            variant="body2"
                                                            noWrap
                                                            sx={{ cursor: 'pointer' }}
                                                        >
                                                            {currentFileData.rubrica || 'N/A'}
                                                        </Typography>
                                                    </Tooltip>
                                                </Paper>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
                                                    <FormControl fullWidth size='small'>
                                                        <InputLabel>Probabilidad</InputLabel>
                                                        <Select
                                                            label="Probabilidad"
                                                            value={dealData?.PROBABILITY || '0'}
                                                            onChange={(e) => {
                                                                setDealData({ ...dealData, PROBABILITY: e.target.value });
                                                            }}
                                                        >
                                                            <MenuItem value="1">1</MenuItem>
                                                            <MenuItem value="20">20</MenuItem>
                                                            <MenuItem value="55">55</MenuItem>
                                                            <MenuItem value="80">80</MenuItem>
                                                            <MenuItem value="95">95</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Paper>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                <Card elevation={0} sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                                            <Description sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                                            Productos ({currentFileData.productos?.length || 0})
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        {renderProductTable()}
                                    </CardContent>
                                </Card>

                                <Card elevation={0} sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                                            Configuración de Envío
                                        </Typography>
                                        <Divider sx={{ mb: 3 }} />

                                        <Grid container spacing={3}>
                                            <Grid size={{ xs: 12 }}>
                                                <Paper sx={{
                                                    p: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F5F5F5'
                                                }}>
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
                                                        onClick={(e) => e.target.showPicker()}
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
                                                            onClick={(e) => e.target.showPicker()}
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
                                                            onClick={(e) => e.target.showPicker()}
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
                                                            onClick={(e) => e.target.showPicker()}
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
                                        <br />
                                        <Divider />
                                        <br />
                                        <Typography variant="h6" gutterBottom>
                                            Campos adicionales
                                        </Typography>
                                        <br />
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <TextField
                                                fullWidth
                                                label="Material Number"
                                                type="text"
                                                placeholder='Opcional (NO APLICA)'
                                                value={formData.codeMaterial}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    codeMaterial: e.target.value
                                                })}
                                                error={!!errors.codeMaterial}
                                                size="large"
                                                InputLabelProps={{ shrink: true }}
                                            />
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
                                                disabled={processing || !dealData || loadingDealData}
                                                sx={{
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
                            <Card elevation={0} sx={{ borderRadius: 2, textAlign: 'center', py: 8, bgcolor: 'background.paper' }}>
                                <CardContent>
                                    <CloudUpload sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        No hay archivo seleccionado
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
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