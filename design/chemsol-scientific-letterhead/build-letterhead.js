const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,ImageRun,Header,Footer,Table,TableRow,TableCell,WidthType,ShadingType,BorderStyle,AlignmentType,VerticalAlign,TableLayoutType}=require('docx');
const GREEN='DCF3E6', TEXT='1E5B44', PW=11906, LM=1080;
const none={style:BorderStyle.SINGLE,size:4,color:GREEN};
const borders={top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none};
const icon=f=>new ImageRun({type:'png',data:fs.readFileSync('assets/'+f+'.png'),transformation:{width:11,height:11}});
const cols=[2500,2900,1850,PW-7250];
const items=[['reg','Reg.\u00A0120180001637'],['mail','sales@chemsolscientific.com'],['phone','+260 97 5576474'],['pin','7 Nyati Close, Rhodes Park, Lusaka, ZAMBIA']];
const cell=(i)=>new TableCell({width:{size:cols[i],type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill:GREEN,color:'auto'},
  verticalAlign:VerticalAlign.CENTER,borders:{top:none,bottom:none,left:none,right:none},
  margins:{top:170,bottom:170,left:i===0?LM-480:80,right:i===3?LM-480:80},
  children:[new Paragraph({alignment:i===0?AlignmentType.LEFT:i===3?AlignmentType.RIGHT:AlignmentType.CENTER,spacing:{before:0,after:0},
    children:[icon(items[i][0]),new TextRun({text:'  '+items[i][1],size:17,color:TEXT,font:'Calibri'})]})]});
const banner=new Table({width:{size:PW,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,indent:{size:-LM,type:WidthType.DXA},borders,
  rows:[new TableRow({children:[0,1,2,3].map(cell)})]});
const doc=new Document({
  creator:'Chemsol Scientific Limited',title:'Chemsol Scientific Letterhead',
  styles:{default:{document:{run:{font:'Calibri',size:22,color:'1C2B25'},paragraph:{spacing:{after:120,line:276}}}}},
  sections:[{properties:{page:{size:{width:PW,height:16838},margin:{top:2700,bottom:1700,left:LM,right:LM,header:500,footer:430}}},
    headers:{default:new Header({children:[new Paragraph({spacing:{before:0,after:0,line:240,lineRule:'auto'},children:[new ImageRun({type:'png',data:fs.readFileSync('assets/logo.png'),transformation:{width:104,height:123}})]})]})},
    footers:{default:new Footer({children:[banner,new Paragraph({spacing:{before:0,after:0,line:20,lineRule:'exact'},children:[]})]})},
    children:[new Paragraph({children:[]})]}]});
Packer.toBuffer(doc).then(b=>fs.writeFileSync('Chemsol Scientific Letterhead.docx',b));
