const BASE_URL = 'https://corsusaint.bitrix24.com/rest/6644/64o0hscrd2vpkgy5';

let _lists = null;

export const fetchBitrixLists = async () => {
    if (_lists) return _lists;

    const [dealRes, quoteRes] = await Promise.all([
        fetch(`${BASE_URL}/crm.deal.fields.json`, { method: 'POST' }),
        fetch(`${BASE_URL}/crm.quote.fields.json`, { method: 'POST' })
    ]);

    const dealFields = (await dealRes.json()).result;
    const quoteFields = (await quoteRes.json()).result;

    const toIds = (field) => field.items.map(item => parseInt(item.ID));
    const mergeSet = (dealField, quoteField) => new Set([...toIds(dealField), ...toIds(quoteField)]);

    _lists = {
        UNAU: mergeSet(dealFields['UF_CRM_1579309558'], quoteFields['UF_CRM_1579310551']),
        UNAI: mergeSet(dealFields['UF_CRM_1579308051'], quoteFields['UF_CRM_1579310442']),
        UNVA: mergeSet(dealFields['UF_CRM_1579309681'], quoteFields['UF_CRM_1579310649']),
        serv: mergeSet(dealFields['UF_CRM_5716A1B71750E'], quoteFields['UF_CRM_1444015918']),
    };

    return _lists;
};

export const lista_area = (products, area, tipo = 0, listaProductos) => {
    if (!_lists) throw new Error('fetchBitrixLists() debe llamarse antes de lista_area()');

    const ar = _lists[area];
    const listado = products
        .map(prod => {
            const key = Object.keys(listaProductos).find(k => listaProductos[k][0] === prod.PRODUCT_ID);
            if (key) {
                const value = listaProductos[key][2 + tipo];
                if (ar.has(value)) return value;
            }
            return null;
        })
        .filter(v => v !== null);

    const values = {
        'UNAU': { '0': 2191, '1': 2237 },
        'UNAI': { '0': 2189, '1': 2197 },
        'UNVA': { '0': 2171, '1': 2265 },
        'serv': { '0': 524, '1': 355 }
    };

    if (listado.length === 0 && values[area] && values[area][tipo]) {
        listado.push(values[area][tipo]);
    }
    console.log('listado: ', listado)
    return listado;
};

export const depart_cisac = (products, tipo = 0, listaProductos) => {
    const unidades = new Set();
    products.forEach(prod => {
        const key = Object.keys(listaProductos).find(k => listaProductos[k][0] === prod.PRODUCT_ID);
        if (key) {
            unidades.add(listaProductos[key][1]);
        }
    });

    const lista = [];
    const unidadesArray = Array.from(unidades);

    if (tipo === 0) {
        if (unidadesArray.some(u => ['UNAU', 'UNAI', 'UNVA', 'Otros'].includes(u))) lista.push(380);
        if (unidadesArray.includes('Servicios')) lista.push(382);
        if (unidadesArray.includes('Proyectos')) lista.push(384);
        if (unidadesArray.includes('HSEQ')) lista.push(2087);
    } else {
        if (unidadesArray.some(u => ['UNAU', 'UNAI', 'UNVA', 'Otros'].includes(u))) lista.push(386);
        if (unidadesArray.includes('Servicios')) lista.push(388);
        if (unidadesArray.includes('Proyectos')) lista.push(390);
        if (unidadesArray.includes('HSEQ')) lista.push(2089);
    }

    return lista;
};

export const unidad_negocio = (products, tipo = 0, listaProductos) => {
    const unidades = new Set();

    products.forEach(prod => {
        const key = Object.keys(listaProductos).find(k => listaProductos[k][0] === prod.PRODUCT_ID);
        if (key) {
            unidades.add(listaProductos[key][1]);
        }
    });

    const lista = [];

    if (tipo === 0) {
        if (unidades.has('UNAU')) lista.push(2033);
        if (unidades.has('UNAI')) lista.push(2035);
        if (unidades.has('UNVA')) lista.push(2037);
    } else {
        if (unidades.has('UNAU')) lista.push(2039);
        if (unidades.has('UNAI')) lista.push(2041);
        if (unidades.has('UNVA')) lista.push(2043);
    }

    return lista;
};

export const getEmpleadoId = (nombre, empleados) => {
    return empleados[nombre] || null;
};
