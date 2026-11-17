import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EmptyState } from './components/States'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<EmptyState title="Page not found" />} />
      </Routes>
    </Layout>
  )
}
