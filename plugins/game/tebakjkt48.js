import { games } from '../../src/lib/ourin-games.js'

games.register('tebakjkt48', {
    alias: ['jkt48', 'jkt'],
    emoji: '🎀',
    title: 'TEBAK JKT48',
    description: 'Tebak nama member JKT48 dari deskripsi',
    hasImage: false
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakjkt48')
export { pluginConfig as config, handler, answerHandler }
