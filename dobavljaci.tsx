import { createFileRoute, Outlet } from '@tanstack/react-router'

/** Okvir za popis dobavljača (/dobavljaci) i karticu dobavljača (/dobavljaci/:id). */
export const Route = createFileRoute('/dobavljaci')({ component: Outlet })
