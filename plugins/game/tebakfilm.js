import { games } from '../../src/lib/ourin-games.js'

games.register('tebakfilm', {
    alias: ['tf', 'guessmovie'],
    emoji: '🎬',
    title: 'TEBAK FILM',
    description: 'Tebak judul film dari poster',
    hasImage: true,
    timeout: 60000
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakfilm')
export { pluginConfig as config, handler, answerHandler }
