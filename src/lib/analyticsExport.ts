import {zipSync,strToU8} from 'fflate'
export type ReportSheet={name:string;rows:(string|number)[][]}
const xml=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
const column=(i:number):string=>i<26?String.fromCharCode(65+i):column(Math.floor(i/26)-1)+column(i%26)
export function xlsxReport(sheets:ReportSheet[]){
 const files:Record<string,Uint8Array>={},put=(path:string,text:string)=>files[path]=strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+text)
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/package/2006/relationships'
 put('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`)
 put('_rels/.rels',`<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
 put('xl/workbook.xml',`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(`${i+1} ${s.name.replace(/[\[\]:*?/\\]/g,' ').slice(0,27)}`)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`)
 put('xl/_rels/workbook.xml.rels',`<Relationships xmlns="${rel}">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`)
 sheets.forEach((s,i)=>put(`xl/worksheets/sheet${i+1}.xml`,`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="20" width="22" customWidth="1"/></cols><sheetData>${s.rows.map((row,r)=>`<row r="${r+1}">${row.map((v,c)=>typeof v==='number'&&Number.isFinite(v)?`<c r="${column(c)}${r+1}"><v>${v}</v></c>`:`<c r="${column(c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`))
 return zipSync(files,{level:6})
}
export async function pdfReport(sheets:ReportSheet[],fontBytes:Uint8Array,title:string){
 const {PDFDocument,rgb}=await import('pdf-lib'),fontkit=(await import('@pdf-lib/fontkit')).default
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(fontBytes,{subset:true})
 const width=842,height=595,margin=32,size=8,line=12;let page=pdf.addPage([width,height]),y=height-margin
 const text=(value:string,x:number,at:number,fontSize=size)=>page.drawText(value,{x,y:at,size:fontSize,font,color:rgb(.1,.14,.18)})
 const newPage=()=>{page=pdf.addPage([width,height]);y=height-margin}
 const wrap=(value:string,w:number)=>{const lines:string[]=[];let current='';for(const char of value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')){if(char==='\n'||font.widthOfTextAtSize(current+char,size)>w){lines.push(current);current=char==='\n'?'':char}else current+=char}lines.push(current);return lines}
 text(title,margin,y,15);y-=28
 for(const sheet of sheets){if(y<95)newPage();text(sheet.name,margin,y,12);y-=22;const count=Math.max(1,...sheet.rows.map(r=>r.length)),w=(width-margin*2)/count
  const drawRow=(row:(string|number)[],header=false)=>{const cells=Array.from({length:count},(_,i)=>wrap(String(row[i]??''),w-12)),max=Math.max(...cells.map(c=>c.length));let offset=0
   while(offset<max){if(y<margin+line*2)newPage();const take=Math.min(max-offset,Math.floor((y-margin-line)/line));if(header)page.drawRectangle({x:margin,y:y-take*line-5,width:width-margin*2,height:take*line+8,color:rgb(.9,.94,.85)});cells.forEach((lines,i)=>lines.slice(offset,offset+take).forEach((v,j)=>text(v,margin+i*w+4,y-j*line)));y-=take*line+10;offset+=take}
  }
  sheet.rows.forEach((row,i)=>{if(y<margin+line*3){newPage();text(sheet.name,margin,y,12);y-=22;if(i>0)drawRow(sheet.rows[0],true)}drawRow(row,i===0)});y-=18
 }
 pdf.getPages().forEach((p,i)=>p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:width-70,y:15,font,size:8}))
 return pdf.save()
}
