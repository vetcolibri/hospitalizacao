import axios from 'axios'
import type { HttpClient } from '../http_client'

export class AxiosAdapter implements HttpClient {
    async post(url: string, body: any): Promise<any> {
        const response = await axios.post(url, body)
        return { status: response.status, data: response.data }
    }

    async get(url: string): Promise<any> {
        const response = await axios.get(url)
        return response.data
    }
}
