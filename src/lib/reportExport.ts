// SpreadsheetML: explicit String cells prevent spreadsheet formula execution.
export function excelReport(sheets:{name:string;rows:(string|number)[][]}[]){
 const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
 return '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+sheets.map(s=>`<Worksheet ss:Name="${escape(s.name.slice(0,31))}"><Table>${s.rows.map(row=>'<Row>'+row.map(v=>`<Cell><Data ss:Type="${typeof v==='number'&&Number.isFinite(v)?'Number':'String'}">${escape(String(v))}</Data></Cell>`).join('')+'</Row>').join('')}</Table></Worksheet>`).join('')+'</Workbook>'
}
