import { IS_CLOUD_MODE } from '@/constants'
import { cloudApi } from './cloud'
import { mockApi } from './mock'
import type { ChallengeApi } from './types'

export const api: ChallengeApi = IS_CLOUD_MODE ? cloudApi : mockApi

export const isMockMode = !IS_CLOUD_MODE
