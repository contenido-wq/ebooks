/**
 * Escribe en la hoja los eventos que envía la página (sidiosjugarafutbol.com/api/wemany/...).
 * Se pega en la hoja: Extensiones > Apps Script. Reemplaza __TOKEN__ por el código secreto
 * (el mismo valor del secreto SHEETS_SCRIPT_TOKEN del Worker). No subir el código real a GitHub.
 *
 * Las columnas las define la página (campo "columnas" de cada envío): si se agregan campos nuevos,
 * aparecen solos al final de la fila de encabezados y no hace falta volver a publicar este script.
 */
const TOKEN = '__TOKEN__';

// Solo se usa si la página no manda "columnas" (versiones antiguas).
const COLUMNAS_POR_DEFECTO = [
  'fecha_recibida', 'evento', 'nombre', 'email', 'telefono', 'pais', 'producto',
  'monto', 'moneda', 'estado', 'id_evento', 'evento_original', 'payload',
];

// Estas columnas son números (se pueden sumar y filtrar); todas las demás se guardan como texto.
const COLUMNAS_NUMERICAS = ['monto', 'valor_neto'];
const MAX_COLUMNAS = 40;

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function columnasValidas(columnas) {
  if (!Array.isArray(columnas) || columnas.length === 0 || columnas.length > MAX_COLUMNAS) return COLUMNAS_POR_DEFECTO;
  for (let i = 0; i < columnas.length; i++) {
    if (typeof columnas[i] !== 'string' || !/^[a-z0-9_]{1,40}$/.test(columnas[i])) return COLUMNAS_POR_DEFECTO;
  }
  return columnas;
}

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    if (!datos || datos.token !== TOKEN) return respuesta({ ok: false, error: 'prohibido' });
    const fila = datos.fila || {};
    const columnas = columnasValidas(datos.columnas);

    const candado = LockService.getScriptLock();
    candado.waitLock(20000);
    try {
      const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      const encabezado = asegurarEncabezado(hoja, columnas);

      // Wemany reintenta con el mismo id: el mismo evento con el mismo id no se duplica.
      // (Un carrito abandonado y su compra posterior son eventos distintos y sí se guardan los dos.)
      if (fila.id_evento && yaExiste(hoja, encabezado, fila.id_evento, fila.evento)) {
        return respuesta({ ok: true, duplicado: true });
      }

      const numero = hoja.getLastRow() + 1;
      const rango = hoja.getRange(numero, 1, 1, encabezado.length);
      // Texto en todo menos los importes: así nada se interpreta como fórmula (=, +, -, @).
      rango.setNumberFormats([encabezado.map(function (c) { return COLUMNAS_NUMERICAS.indexOf(c) !== -1 ? 'General' : '@'; })]);
      rango.setValues([encabezado.map(function (c) { return fila[c] === undefined ? '' : fila[c]; })]);
    } finally {
      candado.releaseLock();
    }
    return respuesta({ ok: true });
  } catch (err) {
    return respuesta({ ok: false, error: 'error_interno' });
  }
}

/** Crea los encabezados si la hoja está vacía y agrega al final los que falten. Devuelve el orden real de columnas. */
function asegurarEncabezado(hoja, columnas) {
  const estilo = function (rango) { return rango.setFontWeight('bold').setBackground('#f3e9d2'); };
  if (hoja.getLastRow() === 0) {
    estilo(hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]));
    hoja.setFrozenRows(1);
    return columnas.slice();
  }
  const actual = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0].map(String);
  const faltan = columnas.filter(function (c) { return actual.indexOf(c) === -1; });
  if (faltan.length > 0) {
    estilo(hoja.getRange(1, actual.length + 1, 1, faltan.length).setValues([faltan]));
    return actual.concat(faltan);
  }
  return actual;
}

function yaExiste(hoja, encabezado, id, evento) {
  const ultima = hoja.getLastRow();
  const colId = encabezado.indexOf('id_evento') + 1;
  const colEvento = encabezado.indexOf('evento') + 1;
  if (ultima < 2 || colId === 0) return false;
  const coincidencias = hoja.getRange(2, colId, ultima - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findAll();
  for (let i = 0; i < coincidencias.length; i++) {
    if (colEvento === 0 || hoja.getRange(coincidencias[i].getRow(), colEvento).getValue() === evento) return true;
  }
  return false;
}
