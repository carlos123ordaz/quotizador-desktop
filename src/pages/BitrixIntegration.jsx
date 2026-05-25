import { useState, useCallback, useEffect, useContext } from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    LinearProgress,
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
import { alpha } from '@mui/material/styles';
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
import { lista_area, depart_cisac, unidad_negocio, getEmpleadoId, fetchBitrixLists } from '../utils/bitrixUtils';
import axios from 'axios';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';
import numeral from 'numeral';
import { readFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import moment from 'moment';
import { corporateColors, getAreaTone } from '../theme/tokens';

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
    const [templateVersions, setTemplateVersions] = useState([]);
    const [selectedVersionId, setSelectedVersionId] = useState('');
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
    const [isDragging, setIsDragging] = useState(false);
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

                        const data = await processExcelFile(file, listaProductos, getSelectedVersionFields(), templateVersions);
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

    }, [listaProductos, selectedFileIndex, selectedVersionId, templateVersions]);

    useEffect(() => {
        let unlistenFn;
        let isSubscribed = true;
        const setupDragDrop = async () => {
            const appWindow = getCurrentWebviewWindow();
            const unlisten = await appWindow.onDragDropEvent(async (event) => {
                if (!isSubscribed) return;
                if (event.payload.type === 'drag-over') {
                    setIsDragging(true);
                } else if (event.payload.type === 'drag-leave' || event.payload.type === 'cancelled') {
                    setIsDragging(false);
                } else if (event.payload.type === 'drop') {
                    setIsDragging(false);
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
                        const data = await processExcelFile(file, listaProductos, getSelectedVersionFields(), templateVersions);
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

    const getTemplateVersions = async () => {
        try {
            const response = await axios.get(`${CONFIG.uri}/template-versions`);
            const activas = (response.data.versiones || []).filter(v => v.activo);
            setTemplateVersions(activas);
        } catch {
            // silencioso — el selector simplemente quedará vacío
        }
    };

    const getSelectedVersionFields = () => {
        if (!selectedVersionId) return null;
        const version = templateVersions.find(v => v._id === selectedVersionId);
        return version ? version.campos : null;
    };

    useEffect(() => {
        getProductos();
        getEmpleados();
        getTemplateVersions();
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
                // Preparado Por (por unidad de negocio)
                "UF_CRM_1774976550": getEmpleadoId(currentFileData.preparado_unau, empleados),
                "UF_CRM_1774976578": getEmpleadoId(currentFileData.preparado_unva, empleados),
                "UF_CRM_1774976594": getEmpleadoId(currentFileData.preparado_unai, empleados),
                "UF_CRM_1774976612": getEmpleadoId(currentFileData.preparado_unap, empleados),
                "UF_CRM_1774976637": getEmpleadoId(currentFileData.preparado_unepc, empleados),
                "UF_CRM_1775065436": getEmpleadoId(currentFileData.preparado_pic, empleados),
                "UF_CRM_1775076171": getEmpleadoId(currentFileData.preparado_pau, empleados),
                // Responsable (por unidad de negocio)
                "UF_CRM_1713160059": getEmpleadoId(currentFileData.responsable_unau, empleados),
                "UF_CRM_1713160085": getEmpleadoId(currentFileData.responsable_unai, empleados),
                "UF_CRM_1713160139": getEmpleadoId(currentFileData.responsable_unva, empleados),
                "UF_CRM_1774503714": getEmpleadoId(currentFileData.responsable_unap, empleados),
                "UF_CRM_1774851221": getEmpleadoId(currentFileData.responsable_unepc, empleados),
                "UF_CRM_1775065357": getEmpleadoId(currentFileData.responsable_pic, empleados),
                "UF_CRM_1775076149": getEmpleadoId(currentFileData.responsable_pau, empleados),
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
            setErrorMessage(Object.values(formErrors).join(' | '));
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

            await fetchBitrixLists();
            const dealParams = buildDealPayload();
            await axios.post(`${webhook}/crm.deal.update`, dealParams);
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


    const activeUnits = new Set((currentFileData?.productos || []).map(p => p.unidadNegocio));

    // ── Area chip color map ──────────────────────────────────────────────────────
    const getAreaChipSx = (unit) => {
        return getAreaTone(unit);
    };

    if (!listaProductos || !empleados) {
        return (
            <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                <CircularProgress size={24} thickness={4} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Cargando datos del sistema...
                </Typography>
            </Box>
        );
    }

    const totales = currentFileData ? calcularTotalesPorArea(currentFileData.productos) : {};
    const totalesEntries = Object.entries(totales).filter(([, v]) => v > 0);

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>

            {/* ── Global progress bar ────────────────────────────────────────── */}
            {(loading || processing) && (
                <LinearProgress sx={{ flexShrink: 0, height: 2, zIndex: 1 }} />
            )}

            {/* ── Alerts ─────────────────────────────────────────────────────── */}
            {(successMessage || errorMessage) && (
                <Box sx={{ px: 3, pt: 1.5, flexShrink: 0 }}>
                    {successMessage && (
                        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ borderRadius: 1.5, mb: 1, py: 0.5 }}>
                            {successMessage}
                        </Alert>
                    )}
                    {errorMessage && (
                        <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ borderRadius: 1.5, mb: 1, py: 0.5 }}>
                            {errorMessage.includes(' | ') ? (
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {errorMessage.split(' | ').map((msg, i) => <li key={i}>{msg}</li>)}
                                </ul>
                            ) : errorMessage}
                        </Alert>
                    )}
                </Box>
            )}

            {/* ── Body: Sidebar + Main ───────────────────────────────────────── */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* ═══════════════════════════════
                 *  SIDEBAR
                 * ═══════════════════════════════ */}
                <Box sx={{
                    width: 272, flexShrink: 0,
                    borderRight: '1px solid', borderColor: 'divider',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    bgcolor: alpha(theme.palette.grey[500], 0.01),
                }}>

                    {/* Version selector */}
                    {templateVersions.length > 0 && (
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', fontSize: '0.63rem', display: 'block', mb: 1 }}>
                                Versión de plantilla
                            </Typography>
                            <FormControl fullWidth size="small">
                                <Select
                                    displayEmpty
                                    value={selectedVersionId}
                                    onChange={e => setSelectedVersionId(e.target.value)}
                                    sx={{ borderRadius: 1.5, fontSize: '0.8125rem' }}
                                >
                                    <MenuItem value="">
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                                            Automático (legado)
                                        </Typography>
                                    </MenuItem>
                                    {templateVersions.map(v => (
                                        <MenuItem key={v._id} value={v._id}>
                                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{v.nombre}</Typography>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    {/* Upload controls */}
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                                Archivos
                            </Typography>
                            {files.length > 0 && (
                                <Chip
                                    label={files.length}
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', '& .MuiChip-label': { px: 0.75 } }}
                                />
                            )}
                        </Box>

                        <Button
                            component="label"
                            variant="outlined"
                            startIcon={<CloudUpload sx={{ fontSize: 15 }} />}
                            fullWidth
                            size="small"
                            sx={{ borderRadius: 1.5, mb: 1.5, textTransform: 'none', fontWeight: 500, fontSize: '0.8125rem' }}
                        >
                            Subir archivos
                            <input type="file" hidden multiple accept=".xlsx,.xls,.xlsm,.xltm" onChange={handleFileUpload} />
                        </Button>

                        {/* Drop zone */}
                        <Box sx={{
                            border: '1.5px dashed',
                            borderColor: isDragging ? 'primary.main' : alpha(theme.palette.grey[500], 0.35),
                            borderRadius: 1.5, p: 1.5, textAlign: 'center',
                            bgcolor: isDragging ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                            transition: 'all 0.15s ease',
                            pointerEvents: 'none',
                        }}>
                            <CloudUpload sx={{ fontSize: 20, color: isDragging ? 'primary.main' : 'text.disabled', display: 'block', mx: 'auto', mb: 0.25 }} />
                            <Typography variant="caption" color={isDragging ? 'primary.main' : 'text.disabled'} sx={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
                                {isDragging ? 'Suelta los archivos aquí' : 'O arrastra archivos .xlsx aquí'}
                            </Typography>
                        </Box>

                        {loading && <LinearProgress sx={{ mt: 1.25, borderRadius: 1, height: 2 }} />}
                    </Box>

                    {/* File list */}
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 1, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
                        {files.length === 0 ? (
                            <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <InsertDriveFile sx={{ fontSize: 26, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ fontSize: '0.75rem', lineHeight: 1.5, px: 2 }}>
                                    Sin archivos cargados
                                </Typography>
                            </Box>
                        ) : (
                            files.map((fileObj, index) => {
                                const isSelected = selectedFileIndex === index;
                                return (
                                    <Box
                                        key={fileObj.id}
                                        onClick={() => handleSelectFile(index)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1,
                                            p: 1, mb: 0.5, borderRadius: 1.5,
                                            border: '1px solid',
                                            borderColor: isSelected ? 'primary.main' : 'transparent',
                                            bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                                            cursor: 'pointer', transition: 'all 0.12s ease',
                                            '&:hover': {
                                                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.04) : alpha(theme.palette.grey[500], 0.06),
                                                borderColor: isSelected ? 'primary.main' : 'divider',
                                            },
                                        }}
                                    >
                                        {fileObj.status === 'success'
                                            ? <CheckCircle sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
                                            : fileObj.status === 'error'
                                                ? <Warning sx={{ fontSize: 16, color: 'error.main', flexShrink: 0 }} />
                                                : <InsertDriveFile sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                                        }
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" noWrap fontWeight={isSelected ? 600 : 400} sx={{ fontSize: '0.8rem', color: isSelected ? 'primary.main' : 'text.primary' }}>
                                                {fileObj.file.name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: fileObj.status === 'error' ? 'error.main' : fileObj.status === 'success' ? 'success.main' : 'text.disabled' }}>
                                                {fileObj.status === 'pending' ? 'Pendiente' : fileObj.status === 'success' ? 'Enviado' : 'Error'}
                                            </Typography>
                                        </Box>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFile(index); }}
                                            sx={{ flexShrink: 0, p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) } }}
                                        >
                                            <Delete sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Box>
                                );
                            })
                        )}
                    </Box>
                </Box>

                {/* ═══════════════════════════════
                 *  MAIN CONTENT
                 * ═══════════════════════════════ */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3, '&::-webkit-scrollbar': { width: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 } }}>

                    {!currentFileData ? (
                        /* ── Empty state ── */
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                            <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.06), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
                                <CloudUpload sx={{ fontSize: 26, color: 'text.disabled' }} />
                            </Box>
                            <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em', mb: 0.5 }}>
                                Sin archivo seleccionado
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, textAlign: 'center', lineHeight: 1.6, mb: 3 }}>
                                Sube un archivo Excel o arrástralo al panel lateral para detectar automáticamente el deal y sus productos.
                            </Typography>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUpload />}
                                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 500 }}
                            >
                                Seleccionar archivo
                                <input type="file" hidden multiple accept=".xlsx,.xls,.xlsm,.xltm" onChange={handleFileUpload} />
                            </Button>
                        </Box>
                    ) : (
                        <Stack spacing={2.5}>

                            {/* ── Inline page header ── */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                                        Enviar a Bitrix24
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
                                        {files[selectedFileIndex]?.file?.name}
                                    </Typography>
                                </Box>
                                <Box sx={{ flexShrink: 0, ml: 2 }}>
                                    {loadingDealData ? (
                                        <Chip size="small" label="Verificando deal..." icon={<CircularProgress size={10} sx={{ ml: '4px !important' }} />} sx={{ height: 24, fontSize: '0.75rem', bgcolor: alpha(theme.palette.grey[500], 0.08), color: 'text.secondary' }} />
                                    ) : dealData ? (
                                        <Chip size="small" label="Deal verificado" icon={<CheckCircle sx={{ fontSize: '13px !important' }} />} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: alpha(corporateColors.accentTeal, 0.16), color: corporateColors.brand, '& .MuiChip-icon': { color: corporateColors.accentTeal } }} />
                                    ) : (
                                        <Chip size="small" label="Deal no encontrado" icon={<Warning sx={{ fontSize: '13px !important' }} />} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: alpha(corporateColors.accentOrange, 0.14), color: corporateColors.accentOrange, '& .MuiChip-icon': { color: corporateColors.accentOrange } }} />
                                    )}
                                </Box>
                            </Box>

                            {/* ═══════════════════════════════════════════
                             *  CARD 1 — Información del Deal
                             * ═══════════════════════════════════════════ */}
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>

                                <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Info sx={{ fontSize: 15, color: 'text.disabled' }} />
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Información del Deal</Typography>
                                    </Box>
                                    {loadingDealData && <CircularProgress size={14} sx={{ color: 'text.disabled' }} />}
                                </Box>

                                <Box sx={{ p: 2.5 }}>
                                    {/* Identifiers row */}
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 2.5, flexWrap: 'wrap' }}>
                                        <Box sx={{ flexShrink: 0 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.63rem', fontWeight: 700, display: 'block', mb: 0.25 }}>Deal</Typography>
                                            <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.main', fontFamily: '"Roboto Mono", monospace', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                                #{currentFileData.numDeal || '—'}
                                            </Typography>
                                        </Box>
                                        <Divider orientation="vertical" flexItem />
                                        <Box sx={{ flex: 1, minWidth: 200 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.63rem', fontWeight: 700, display: 'block', mb: 0.25 }}>Oferta</Typography>
                                            <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                                                {currentFileData.name || '—'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ flexShrink: 0 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.63rem', fontWeight: 700, display: 'block', mb: 0.5 }}>Probabilidad</Typography>
                                            <FormControl size="small" sx={{ minWidth: 110 }}>
                                                <Select
                                                    value={dealData?.PROBABILITY || '0'}
                                                    onChange={(e) => setDealData({ ...dealData, PROBABILITY: e.target.value })}
                                                    disabled={loadingDealData || !dealData}
                                                    sx={{ borderRadius: 1.5, fontSize: '0.875rem', fontWeight: 600 }}
                                                >
                                                    <MenuItem value="1">1%</MenuItem>
                                                    <MenuItem value="20">20%</MenuItem>
                                                    <MenuItem value="55">55%</MenuItem>
                                                    <MenuItem value="80">80%</MenuItem>
                                                    <MenuItem value="95">95%</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Box>
                                    </Box>

                                    {/* Team grid */}
                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        {[
                                            {
                                                title: 'Preparado por',
                                                rows: [
                                                    { label: 'Principal', value: currentFileData.preparado, always: true },
                                                    { label: 'UNAU',  value: currentFileData.preparado_unau,  unit: 'UNAU' },
                                                    { label: 'UNAI',  value: currentFileData.preparado_unai,  unit: 'UNAI' },
                                                    { label: 'UNVA',  value: currentFileData.preparado_unva,  unit: 'UNVA' },
                                                    { label: 'UNAP',  value: currentFileData.preparado_unap,  unit: 'UNAP' },
                                                    { label: 'UNEPC', value: currentFileData.preparado_unepc, unit: 'UNEPC' },
                                                    { label: 'PIC',   value: currentFileData.preparado_pic,   unit: 'PIC' },
                                                    { label: 'PAU',   value: currentFileData.preparado_pau,   unit: 'PAU' },
                                                ],
                                            },
                                            {
                                                title: 'Responsable',
                                                rows: [
                                                    { label: 'Principal', value: currentFileData.responsable, always: true },
                                                    { label: 'UNAU',  value: currentFileData.responsable_unau,  unit: 'UNAU' },
                                                    { label: 'UNAI',  value: currentFileData.responsable_unai,  unit: 'UNAI' },
                                                    { label: 'UNVA',  value: currentFileData.responsable_unva,  unit: 'UNVA' },
                                                    { label: 'UNAP',  value: currentFileData.responsable_unap,  unit: 'UNAP' },
                                                    { label: 'UNEPC', value: currentFileData.responsable_unepc, unit: 'UNEPC' },
                                                    { label: 'PIC',   value: currentFileData.responsable_pic,   unit: 'PIC' },
                                                    { label: 'PAU',   value: currentFileData.responsable_pau,   unit: 'PAU' },
                                                ],
                                            },
                                        ].map(section => (
                                            <Grid key={section.title} size={{ xs: 12, md: 6 }}>
                                                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', height: '100%' }}>
                                                    <Box sx={{ px: 2, py: 1, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: '1px solid', borderColor: 'divider' }}>
                                                        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', fontSize: '0.63rem' }}>{section.title}</Typography>
                                                    </Box>
                                                    <Box sx={{ px: 2, py: 1.25 }}>
                                                        {section.rows.filter(r => r.always || !!r.value).map((row, i, arr) => (
                                                            <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, py: 0.6, borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: alpha(theme.palette.divider, 0.5) }}>
                                                                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, fontSize: '0.8rem' }}>{row.label}</Typography>
                                                                <Typography variant="body2" fontWeight={600} align="right" sx={{ fontSize: '0.8rem', color: row.value ? 'text.primary' : 'text.disabled' }}>
                                                                    {row.value || '—'}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>

                                    {/* Bottom metrics strip */}
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        <Box sx={{ flex: 1, minWidth: 100, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.63rem', fontWeight: 700, display: 'block', mb: 0.25 }}>Visto Bueno</Typography>
                                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>{currentFileData.vistoBueno || '—'}</Typography>
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 100, p: 1.5, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.3), borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.03) }}>
                                            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.63rem', fontWeight: 700, color: 'success.dark', display: 'block', mb: 0.25 }}>Utilidad</Typography>
                                            <Typography variant="body2" fontWeight={700} sx={{ color: 'success.dark', fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>
                                                {currentFileData.utilidad ? `${(currentFileData.utilidad * 100).toFixed(2)}%` : '—'}
                                            </Typography>
                                        </Box>
                                        {currentFileData.rubrica && (
                                            <Box sx={{ flex: 3, minWidth: 0, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.63rem', fontWeight: 700, display: 'block', mb: 0.25 }}>Rúbrica / Códigos</Typography>
                                                <Tooltip title={currentFileData.rubrica} arrow>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={500}
                                                        sx={{
                                                            fontFamily: '"Roboto Mono", monospace',
                                                            fontSize: '0.78rem',
                                                            cursor: 'default',
                                                            whiteSpace: 'normal',
                                                            overflowWrap: 'anywhere',
                                                            wordBreak: 'break-word',
                                                        }}
                                                    >
                                                        {currentFileData.rubrica}
                                                    </Typography>
                                                </Tooltip>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Paper>

                            {/* ═══════════════════════════════════════════
                             *  CARD 2 — Productos detectados
                             * ═══════════════════════════════════════════ */}
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>

                                <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Description sx={{ fontSize: 15, color: 'text.disabled' }} />
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Productos detectados</Typography>
                                        <Chip label={currentFileData.productos?.length || 0} size="small" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', '& .MuiChip-label': { px: 0.75 } }} />
                                    </Box>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                        {[...activeUnits].map(unit => (
                                            <Chip key={unit} label={unit} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, borderRadius: 1, '& .MuiChip-label': { px: 0.75 }, ...getAreaChipSx(unit) }} />
                                        ))}
                                    </Stack>
                                </Box>

                                <TableContainer sx={{ maxHeight: 340, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 } }}>
                                    <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
                                        <TableHead>
                                            <TableRow>
                                                {[{ label: 'ID', width: '14%' }, { label: 'Nombre' }, { label: 'Precio', width: '16%' }, { label: 'Área', width: '12%' }].map(col => (
                                                    <TableCell key={col.label} sx={{ fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid', borderBottomColor: 'divider', py: 1.5, px: 2, whiteSpace: 'nowrap', bgcolor: 'background.paper', ...(col.width ? { width: col.width } : {}) }}>
                                                        {col.label}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {currentFileData.productos.map((producto, index) => (
                                                <TableRow key={index} hover sx={{ '& .MuiTableCell-root': { py: 1, px: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }, ...(index % 2 !== 0 ? { bgcolor: alpha(theme.palette.grey[500], 0.02) } : {}), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}>
                                                    <TableCell>
                                                        <Typography variant="caption" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.72rem', color: 'text.secondary' }}>
                                                            {producto.productId}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" noWrap sx={{ fontSize: '0.8125rem' }}>{producto.nombre}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                                                            {producto.precio ? `$${numeral(producto.precio).format('0,0.00')}` : '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={producto.unidadNegocio} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, borderRadius: 1, '& .MuiChip-label': { px: 0.75 }, ...getAreaChipSx(producto.unidadNegocio) }} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {totalesEntries.length > 0 && (
                                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.grey[500], 0.01) }}>
                                        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', fontSize: '0.63rem', display: 'block', mb: 1.25 }}>
                                            Totales por área
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                                            {totalesEntries.map(([area, total]) => (
                                                <Box key={area} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1, bgcolor: 'background.paper', minWidth: 100 }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.63rem', display: 'block', mb: 0.25 }}>{area}</Typography>
                                                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                                                        ${numeral(total).format('0,0.00')}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Paper>

                            {/* ═══════════════════════════════════════════
                             *  CARD 3 — Configuración de Envío
                             * ═══════════════════════════════════════════ */}
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>

                                <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Send sx={{ fontSize: 15, color: 'text.disabled' }} />
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>Configuración de Envío</Typography>
                                    </Box>
                                    <Chip
                                        label={createQuote ? 'Crear Quote nueva' : `Actualizar Quote #${formData.numQuote}`}
                                        size="small"
                                        icon={createQuote ? <CheckCircle sx={{ fontSize: '13px !important' }} /> : <Info sx={{ fontSize: '13px !important' }} />}
                                        sx={{
                                            height: 24, fontSize: '0.75rem', fontWeight: 600, borderRadius: 1,
                                            '& .MuiChip-label': { px: 1 },
                                            ...(createQuote
                                                ? { bgcolor: alpha(corporateColors.accentTeal, 0.16), color: corporateColors.brand, '& .MuiChip-icon': { color: corporateColors.accentTeal, ml: '6px' } }
                                                : { bgcolor: alpha(corporateColors.primaryHover, 0.16), color: corporateColors.primary, '& .MuiChip-icon': { color: corporateColors.primary, ml: '6px' } })
                                        }}
                                    />
                                </Box>

                                <Box sx={{ p: 2.5 }}>

                                    {/* Date fields (only when creating a new quote) */}
                                    {createQuote && (
                                        <Box sx={{ mb: 2.5 }}>
                                            <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', fontSize: '0.63rem', display: 'block', mb: 1.5 }}>
                                                Fechas de la Quote
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                    <TextField fullWidth label="Fecha Correo" type="date" onClick={(e) => e.target.showPicker()} value={formData.fechaCorreo} onChange={(e) => setFormData({ ...formData, fechaCorreo: e.target.value })} error={!!errors.fechaCorreo} helperText={errors.fechaCorreo} required size="small" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                    <TextField fullWidth label="Fecha Inicio" type="date" onClick={(e) => e.target.showPicker()} value={formData.fechaInicio} onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })} error={!!errors.fechaInicio} helperText={errors.fechaInicio} required size="small" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                    <TextField fullWidth label="Fecha Envío" type="date" onClick={(e) => e.target.showPicker()} value={formData.fechaEnvio} onChange={(e) => setFormData({ ...formData, fechaEnvio: e.target.value })} error={!!errors.fechaEnvio} helperText={errors.fechaEnvio} required size="small" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    )}

                                    {/* Cambiar fecha de cierre */}
                                    <Box sx={{ mb: 2.5 }}>
                                        <FormControlLabel
                                            control={<Switch checked={formData.cambiarFechaCierre} onChange={(e) => setFormData({ ...formData, cambiarFechaCierre: e.target.checked })} size="small" />}
                                            label={<Typography variant="body2">Cambiar fecha de cierre del deal</Typography>}
                                        />
                                        {formData.cambiarFechaCierre && (
                                            <Box sx={{ mt: 1.5, maxWidth: 240 }}>
                                                <TextField fullWidth label="Nueva Fecha Cierre" type="date" onClick={(e) => e.target.showPicker()} value={formData.fechaCierre} onChange={(e) => setFormData({ ...formData, fechaCierre: e.target.value })} error={!!errors.fechaCierre} helperText={errors.fechaCierre} size="small" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Material Number */}
                                    <Box sx={{ mb: 2.5 }}>
                                        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', fontSize: '0.63rem', display: 'block', mb: 1 }}>
                                            Campos adicionales
                                        </Typography>
                                        <TextField
                                            label="Material Number"
                                            type="text"
                                            placeholder="Opcional (NO APLICA)"
                                            value={formData.codeMaterial}
                                            onChange={(e) => setFormData({ ...formData, codeMaterial: e.target.value })}
                                            error={!!errors.codeMaterial}
                                            size="small"
                                            InputLabelProps={{ shrink: true }}
                                            sx={{ maxWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                        />
                                    </Box>

                                    <Divider sx={{ mb: 2.5 }} />

                                    {/* Submit row */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Button
                                            variant="text"
                                            onClick={() => { setSelectedFileIndex(null); setCurrentFileData(null); }}
                                            sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 1.5, '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.08) } }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <Send />}
                                            onClick={handleSubmit}
                                            disabled={processing || !dealData || loadingDealData}
                                            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, px: 3.5, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
                                        >
                                            {processing ? 'Enviando a Bitrix24...' : createQuote ? 'Crear Quote y Enviar' : 'Actualizar Quote y Enviar'}
                                        </Button>
                                    </Box>

                                    {processing && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
                                </Box>
                            </Paper>

                            <Box sx={{ pb: 1 }} />
                        </Stack>
                    )}
                </Box>
            </Box>
        </Box>
    );
};
