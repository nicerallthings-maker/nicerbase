import type { PropsWithChildren } from 'react'

import { ProjectLayout } from '../ProjectLayout'
import { MongoDBMenu } from '@/components/interfaces/MongoDB/MongoDBMenu'
import { withAuth } from '@/hooks/misc/withAuth'

const MongoDBLayout = ({ children }: PropsWithChildren) => (
  <ProjectLayout
    product="MongoDB"
    browserTitle={{ section: 'MongoDB' }}
    productMenu={<MongoDBMenu />}
    isBlocking={false}
  >
    {children}
  </ProjectLayout>
)

export default withAuth(MongoDBLayout)
