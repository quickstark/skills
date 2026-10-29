import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {here} from './runtime.mjs';
const base=join(here,'comparison-v3'),plan=JSON.parse(await readFile(join(base,'plan.json')));const rows=[];
for(const row of plan.schedule){
 let events;try{events=(await readFile(join(base,'runs',row.id,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);}catch{continue;}
 let telemetry;try{telemetry=JSON.parse(await readFile(join(base,'runs',row.id,'telemetry.json')));}catch{continue;}
 const commands=events.filter(e=>e.type==='item.completed'&&e.item.type==='command_execution').map(e=>({command:e.item.command,exit:e.item.exit_code,output:e.item.aggregated_output}));
 const calls=events.filter(e=>e.type==='item.completed'&&['mcp_tool_call','dynamic_tool_call','collab_tool_call','imageGeneration','image_generation','web_search'].includes(e.item.type)).map(e=>e.item);
 const record={id:row.id,commands,calls,toolTypes:[...new Set(telemetry.toolItems.map(i=>i.type))],eventsSHA256:createHash('sha256').update(await readFile(join(base,'runs',row.id,'events.jsonl'))).digest('hex')};rows.push(record);
}
await writeFile(join(base,'tool-review-material.json'),JSON.stringify(rows,null,2)+'\n');
for(const row of rows)console.log(JSON.stringify({id:row.id,toolTypes:row.toolTypes,calls:row.calls.length,commands:row.commands.map(c=>({head:c.command.split('\n')[0].slice(0,240),exit:c.exit}))}));
