import { createFileRoute } from '@tanstack/react-router'

import MongoDBLayout from '@/components/layouts/MongoDBLayout/MongoDBLayout'
import MongoDBPage from '@/pages/project/[ref]/mongodb'

export const Route = createFileRoute('/project/$ref/mongodb/')({
  component: MongoDBRoute,
})

function MongoDBRoute() {
  return (
    <MongoDBLayout>
      <MongoDBPage dehydratedState={undefined} />
    </MongoDBLayout>
  )
}
