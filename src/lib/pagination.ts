export async function readAllPages<T>(fetchPage:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>,pageSize=500):Promise<{data:T[]|null;error:unknown}>{
 const rows:T[]=[]
 for(let start=0;;start+=pageSize){
  const result=await fetchPage(start,start+pageSize-1)
  if(result.error)return {data:null,error:result.error}
  rows.push(...(result.data||[]))
  if(!result.data||result.data.length<pageSize)return {data:rows,error:null}
 }
}
