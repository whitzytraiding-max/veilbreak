export const CHAPTERS = [
  {
    id: 1,
    title: 'The Shattered Coast',
    subtitle: 'Where the world first broke',
    bgColor: 0x080E1A,
    accentColor: 0x3B7AE8,
    nodeTypes: ['FIRE', 'WATER', 'EARTH'],
    unlocked: true,
    storyPanels: [
      {
        bg: 0x080E1A,
        accent: 0x3B7AE8,
        title: 'The First Tear',
        lines: [
          'The ocean remembered being whole.',
          'Then the Veil came — and the coast',
          'shattered into a thousand drifting shards.',
          'Someone had to mend it.',
          'That someone was you.',
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Ember Vaults',
    subtitle: 'Fire that never sleeps',
    bgColor: 0x180A04,
    accentColor: 0xE83B3B,
    nodeTypes: ['FIRE', 'WATER', 'EARTH', 'SHADOW'],
    unlocked: false,
    storyPanels: [
      {
        bg: 0x180A04,
        accent: 0xE83B3B,
        title: 'Beneath the Flame',
        lines: [
          'Deep underground, temples still burned.',
          'The Veil fed on heat — growing stronger',
          'with every ember it consumed.',
          'You descended into the dark',
          'to starve it of fire.',
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Whisper Forests',
    subtitle: 'Trees that speak in static',
    bgColor: 0x080E08,
    accentColor: 0x2EAA4E,
    nodeTypes: ['FIRE', 'WATER', 'EARTH', 'AIR', 'SHADOW'],
    unlocked: false,
    storyPanels: [
      {
        bg: 0x080E08,
        accent: 0x2EAA4E,
        title: 'The Living Dark',
        lines: [
          'The forest had eyes.',
          'Every tree was a memory the Veil',
          'had not yet swallowed.',
          'You moved through the silence,',
          'stitching light back into the leaves.',
        ],
      },
    ],
  },
];
