import {createContext,useContext} from 'react'
export const StudioTimezone=createContext('Europe/Kyiv')
export const useStudioTimezone=()=>useContext(StudioTimezone)
