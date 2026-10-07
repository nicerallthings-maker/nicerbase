import { MongoDBExplorer } from '@/components/interfaces/MongoDB/MongoDBExplorer'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import MongoDBLayout from '@/components/layouts/MongoDBLayout/MongoDBLayout'
import type { NextPageWithLayout } from '@/types'

const MongoDBPage: NextPageWithLayout = () => <MongoDBExplorer />

MongoDBPage.getLayout = (page) => (
  <DefaultLayout>
    <MongoDBLayout>{page}</MongoDBLayout>
  </DefaultLayout>
)

export default MongoDBPage
