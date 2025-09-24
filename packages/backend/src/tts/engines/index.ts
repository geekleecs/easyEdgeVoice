import { ttsPluginManager } from '../pluginManager'
import { EdgeTtsEngine } from './edgeTts'
import { OpenAITtsEngine } from './openaiTts'
import { REGISTER_OPENAI_TTS } from '../../config'

export function registerEngines() {
  ttsPluginManager.registerEngine(new EdgeTtsEngine())
  if (REGISTER_OPENAI_TTS) {
    ttsPluginManager.registerEngine(new OpenAITtsEngine(process.env.OPENAI_API_KEY!))
  }
}
