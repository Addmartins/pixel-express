import OperatorConsole from '@/components/OperatorConsole'
import { demoEnabled } from '@/lib/operatorSession'

export const dynamic = 'force-dynamic'

export default function Home() {
  return <OperatorConsole demoAvailable={demoEnabled()} />
}
