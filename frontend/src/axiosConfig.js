import axios from 'axios'

axios.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 403) {
      window.location.href = '/403'
    }

    return Promise.reject(error)
  },
)
