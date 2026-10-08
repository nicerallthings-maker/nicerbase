import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { DEFAULT_PROJECT } from '@/lib/constants/api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGetAll(req, res)
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const handleGetAll = async (_req: NextApiRequest, res: NextApiResponse) => {
  // Platform specific endpoint. Self-hosted has a single admin; its display name and
  // email can be set with STUDIO_ADMIN_NAME / STUDIO_ADMIN_EMAIL. The username stays
  // fixed because saved snippets reference it as their owner.
  const [firstName, ...rest] = (process.env.STUDIO_ADMIN_NAME || 'NicerBase Admin')
    .trim()
    .split(/\s+/)
  const response = {
    id: 1,
    primary_email: process.env.STUDIO_ADMIN_EMAIL || 'admin@nicerbase.local',
    username: 'johndoe',
    first_name: firstName,
    last_name: rest.join(' '),
    organizations: [
      {
        id: 1,
        name: process.env.DEFAULT_ORGANIZATION_NAME || 'Default Organization',
        slug: 'default-org-slug',
        billing_email: 'billing@supabase.co',
        projects: [{ ...DEFAULT_PROJECT, connectionString: '' }],
      },
    ],
  }
  return res.status(200).json(response)
}
