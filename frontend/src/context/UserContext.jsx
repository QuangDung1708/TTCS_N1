
import { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    function getUserInfo() {
      const token = localStorage.getItem('crm_token')

      if (!token) {
        setUserInfo(null)
        return
      }

      try {
        const decoded = jwtDecode(token)

        const user = {
          id: decoded.id,
          email: decoded.email,
          role_name: decoded.role_name,
          group_id: decoded.group_id,
        }

        setUserInfo(user)

        console.log('User info:', user)
      } catch (error) {
        console.error('Không thể giải mã crm_token:', error)
        setUserInfo(null)
      }
    }

    getUserInfo()
  }, [])

  return (
    <UserContext.Provider value={{ userInfo, setUserInfo }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
