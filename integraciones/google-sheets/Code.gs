/**
 * Escribe en la hoja los eventos que envía la página (sidiosjugarafutbol.com/api/wemany/...).
 * Se pega en la hoja: Extensiones > Apps Script. Reemplaza __TOKEN__ por el código secreto
 * (el mismo valor del secreto SHEETS_SCRIPT_TOKEN del Worker). No subir el código real a GitHub.
 */
const TOKEN = '__TOKEN__';

const COLUMNAS = [
  'fecha_recibida', 'evento', 'nombre', 'email', 'telefono', 'pais', 'producto',
  'monto', 'moneda', 'estado', 'id_evento', 'evento_original', 'payload',
];

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    if (!datos || datos.token !== TOKEN) return respuesta({ ok: false, error: 'prohibido' });
    const fila = datos.fila || {};

    const candado = LockService.getScriptLock();
    candado.waitLock(20000);
    try {
      const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      prepararEncabezado(hoja);

      // Wemany puede reintentar: si ya está el mismo evento con el mismo id, no se duplica.
      if (fila.id_evento && yaExiste(hoja, fila.id_evento, fila.evento)) {
        return respuesta({ ok: true, duplicado: true });
      }

      const numero = hoja.getLastRow() + 1;
      const rango = hoja.getRange(numero, 1, 1, COLUMNAS.length);
      // Formato de texto en todo menos el monto: así nada se interpreta como fórmula (=, +, -, @).
      rango.setNumberFormats([COLUMNAS.map(function (c) { return c === 'monto' ? 'General' : '@'; })]);
      rango.setValues([COLUMNAS.map(function (c) { return fila[c] === undefined ? '' : fila[c]; })]);
    } finally {
      candado.releaseLock();
    }
    return respuesta({ ok: true });
  } catch (err) {
    return respuesta({ ok: false, error: 'error_interno' });
  }
}

function prepararEncabezado(hoja) {
  if (hoja.getLastRow() > 0) return;
  const rango = hoja.getRange(1, 1, 1, COLUMNAS.length);
  rango.setValues([COLUMNAS]).setFontWeight('bold').setBackground('#f3e9d2');
  hoja.setFrozenRows(1);
}

function yaExiste(hoja, id, evento) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return false;
  const colId = COLUMNAS.indexOf('id_evento') + 1;
  const colEvento = COLUMNAS.indexOf('evento') + 1;
  const coincidencias = hoja.getRange(2, colId, ultima - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findAll();
  for (let i = 0; i < coincidencias.length; i++) {
    if (hoja.getRange(coincidencias[i].getRow(), colEvento).getValue() === evento) return true;
  }
  return false;
}
