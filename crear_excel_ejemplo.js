// Script para crear archivo Excel de ejemplo para pruebas
const XLSX = require('xlsx');

// Datos de ejemplo
const data = [
    {
        'Código': 'ART001',
        'Nombre': 'Harina 000',
        'Descripción': 'Harina de trigo tipo 000',
        'Categoría': 'SECOS',
        'Unidad Medida': 'KG'
    },
    {
        'Código': 'ART002',
        'Nombre': 'Azúcar',
        'Descripción': 'Azúcar blanca refinada',
        'Categoría': 'SECOS',
        'Unidad Medida': 'KG'
    },
    {
        'Código': 'ART003',
        'Nombre': 'Aceite de Girasol',
        'Descripción': 'Aceite vegetal de girasol',
        'Categoría': 'ACEITES',
        'Unidad Medida': 'LT'
    },
    {
        'Código': 'ART004',
        'Nombre': 'Leche Entera',
        'Descripción': 'Leche entera pasteurizada',
        'Categoría': 'LACTEOS',
        'Unidad Medida': 'LT'
    },
    {
        'Código': 'ART005',
        'Nombre': 'Sal Fina',
        'Descripción': 'Sal de mesa fina',
        'Categoría': 'CONDIMENTOS',
        'Unidad Medida': 'KG'
    }
];

// Crear workbook y worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);

// Agregar worksheet al workbook
XLSX.utils.book_append_sheet(wb, ws, 'Artículos');

// Guardar archivo
XLSX.writeFile(wb, 'articulos_ejemplo.xlsx');

console.log('✅ Archivo articulos_ejemplo.xlsx creado exitosamente');
