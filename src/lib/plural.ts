/** Ukrainian plural form: 1 клієнт, 2–4 клієнти, 5+ (and 11–14) клієнтів. */
export function pluralUk(n:number,one:string,few:string,many:string){
  const a=Math.abs(n)%100,b=a%10
  if(a>10&&a<20)return many
  if(b===1)return one
  if(b>=2&&b<=4)return few
  return many
}
