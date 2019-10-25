/*
 * @license
 * Your First PWA Codelab (https://g.co/codelabs/pwa)
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
'use strict';

// CODELAB: Update cache names any time any of the cached files change.
const CACHE_NAME = 'static-cache-v3';
const DATA_CACHE_NAME = 'data-cache-v2';

// CODELAB: Add list of files to cache here.
const FILES_TO_CACHE = [
    './offline.html',
    './index.html',
    './linz.html',
    './radlkarte.css',
    './radlkarte.js',
    './manifest.json',
    './styles.js',
    './js/polyfills.js',
    './js/leaflet-1.4.0/leaflet.js',
    "./js/leaflet-sidebar-v2-3.0.6/leaflet-sidebar.min.js",
    "./js/leaflet-sidebar-v2-3.0.6/leaflet-sidebar.css",
    "../css/font-awesome-4.7.0/css/font-awesome.min.css",
    "./js/leaflet-polylineDecorator-1.6.0/leaflet.polylineDecorator.js",
    "./js/leaflet-hash-1.0.1/leaflet-hash.min.js",
    "./js/leaflet-locatecontrol-0.66.1/L.Control.Locate.min.js",
    "./js/leaflet-locatecontrol-0.66.1/L.Control.Locate.css",
    "./js/leaflet-control-geocoder-1.5.8/Control.Geocoder.js",
    "./js/leaflet-control-geocoder-1.5.8/Control.Geocoder.css",
    "./js/turf-2017-02-16/turf.min.js",
    "./js/jquery-3.3.1.min.js",
    "./css/museo-500/style.css",
    'https://fonts.googleapis.com/css?family=Roboto:400,400italic,700',
    "./css/favicon.ico",
    './Verkehrsstadtplan-2012.png'
];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  // CODELAB: Precache static resources here.
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
);
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  // CODELAB: Remove previous cached data from disk.
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
);
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  console.log('[ServiceWorker] Fetch', evt.request.url);
  // CODELAB: Add fetch event handler here.

  evt.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(evt.request)
          .then((response) => {
            return response || fetch(evt.request);
          });
    })
);
});



