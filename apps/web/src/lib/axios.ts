import baseAxios from 'axios'

const PORT = import.meta.env.DEV ? 4000 : 8080

const axios = baseAxios.create({
	baseURL: `http://localhost:${PORT}`
})

export default axios
