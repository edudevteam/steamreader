import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import 'tailwindcss/tailwind.css'
import 'highlight.js/styles/github-dark.css'
import { router } from 'router'

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
