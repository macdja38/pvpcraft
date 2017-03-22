/**
 * Created by macdja38 on 2017-02-28.
 */
"use strict";
const Docma = require('docma');

let config = {
  app: {
    title: 'pvpcraft',
    base: '/pvpcraft/',
    server: Docma.ServerType.GITHUB,
  },
  src: [
    './lib/*.js',
    './README.md',
  ],
  dest: './docs',
  jsdoc: {
    plugins: ["node_modules/jsdoc-strip-async-await"]
  },
  template: {
    // Template-specific options
    options: {
      title: 'PvPCraft',
      sidebar: true,
      collapsed: false,
      badges: true,
      search: true,
      navbar: true,
      navItems: [
        {
          label: 'Documentation',
          href: '#',
          iconClass: 'ico-book'
        },
        {
          label: 'Demos',
          href: 'https://github.com/macdja38/pvpcraft/tree/master/modules',
          iconClass: 'ico-mouse-pointer'
        },
        {
          label: 'Download',
          iconClass: 'ico-md ico-download',
          items: [
            {
              label: 'dev',
              href: 'https://github.com/macdja38/pvpcraft/archive/dev.zip',
            },
            {
              label: 'release',
              href: 'https://github.com/macdja38/pvpcraft/archive/master.zip',
            }
          ]
        },
        {
          label: 'GitHub',
          href: 'https://github.com/macdja38/pvpcraft',
          target: '_blank',
          iconClass: 'ico-md ico-github'
        }
      ]
    }
  },
};

Docma.create()
  .build(config)
  .then(function () {
    console.log('Documentation built successfully.');
  })
  .catch(function (error) {
    console.log(error);
  });