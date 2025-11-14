const lista_AU = new Set([2145, 2147, 2149, 2151, 2153, 2155, 2157, 2159, 2161, 2163, 2165, 2377, 2721, 2379, 2167, 2169, 2239, 2241, 2243, 2245, 2247, 2249, 2251, 2253, 2255, 2257, 2259, 2381, 2723, 2383, 2261, 2263, 3010, 3034, 3012, 3036, 3014, 3038, 3016, 3040, 3018, 3042, 3020, 3044, 3022, 3046, 2920, 2922, 3024, 3048, 3028, 3052, 3030, 3054, 3032, 3056, 3026, 3050]);
const lista_AI = new Set([2101, 2121, 2123, 2125, 2127, 2129, 2103, 2111, 2105, 2113, 2131, 2133, 2107, 2137, 2139, 2141, 2143, 2199, 2201, 2203, 2205, 2207, 2209, 2211, 2213, 2215, 2217, 2219, 2221, 2223, 2225, 2227, 2229, 2231, 2233, 2235, 2896, 2904, 2898, 2906, 2900, 2908, 2902, 2910]);
const lista_VA = new Set([2173, 2175, 2177, 2673, 2675, 2677, 2679, 2681, 2683, 2685, 2179, 2181, 2687, 2183, 2185, 2187, 2193, 2195, 2267, 2269, 2271, 2689, 2691, 2693, 2695, 2697, 2699, 2701, 2273, 2275, 2703, 2277, 2279, 2281, 2283, 2285, 2928, 2942, 2930, 2944, 2932, 2946, 3004, 3006, 2934, 2948, 2936, 2950, 2938, 2952]);
const lista_serv = new Set([357, 359, 2097, 363, 2065, 365, 2067, 2069, 367, 2071, 371, 373, 375, 377, 379, 526, 528, 2095, 530, 2057, 532, 2059, 2061, 536, 2063, 540, 542, 544, 546, 548, 2800, 2802]);

export const lista_area = (products, area, tipo = 0, listaProductos) => {
    const obj_area = {
        'UNAU': lista_AU,
        'UNAI': lista_AI,
        'UNVA': lista_VA,
        'serv': lista_serv
    };

    const ar = obj_area[area];
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