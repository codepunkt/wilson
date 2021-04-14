// rollups EVAL warning is disabled for this file
export const objectSourceToObject = <T extends object>(
  objSource: string
): T => {
  return eval(`const obj=()=>(${objSource});obj`)()
}
