import { createContext, useContext } from 'react'

export const UserTableContext = createContext({
	onEditUser: (user: any) => {}
})

export const useUserTableContext = () => useContext(UserTableContext)
