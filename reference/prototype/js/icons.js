/* ==========================================================================
   Icon set — 24px line icons (stroke 1.7, round caps) drawn to match the
   reference mockups. Base shapes follow the asset kit (04_icons); icons the
   kit does not include (cap, headset, scan, history, wardrobe, receipt…)
   were drawn in the same style. All icons inherit `currentColor`.
   ========================================================================== */
(function () {
  const VT = (window.VT = window.VT || {});

  // `s:` stroke paths, `f:` filled paths (fill=currentColor, no stroke)
  const P = {
    back: { s: '<path d="M15.5 4.2 7.7 12l7.8 7.8"/>' },
    'chevron-right': { s: '<path d="m9.2 5.4 6.6 6.6-6.6 6.6"/>' },
    'chevron-down': { s: '<path d="m6 9.2 6 6 6-6"/>' },
    'chevron-left-sm': { s: '<path d="m14.5 6-6 6 6 6"/>' },
    'arrow-right': { s: '<path d="M4.2 12h15.3M13.8 6.3 19.5 12l-5.7 5.7"/>' },
    'arrow-up': { s: '<path d="M12 19.6V4.8M6.2 10.6 12 4.8l5.8 5.8"/>' },
    close: { s: '<path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/>' },
    plus: { s: '<path d="M12 4.6v14.8M4.6 12h14.8"/>' },
    minus: { s: '<path d="M5.5 12h13"/>' },
    check: { s: '<path d="m5 12.6 4.5 4.4L19 7.4"/>' },
    search: { s: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="m15.6 15.6 4.6 4.6"/>' },
    scan: { s: '<path d="M4 8.4V6.2A2.2 2.2 0 0 1 6.2 4h2.2M15.6 4h2.2A2.2 2.2 0 0 1 20 6.2v2.2M20 15.6v2.2a2.2 2.2 0 0 1-2.2 2.2h-2.2M8.4 20H6.2A2.2 2.2 0 0 1 4 17.8v-2.2M7.6 12h8.8"/>' },
    bag: { s: '<path d="M5.4 8.2h13.2l-.9 11.4a1.5 1.5 0 0 1-1.5 1.4H7.8a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M8.9 10.6V7.4a3.1 3.1 0 0 1 6.2 0v3.2"/>' },
    'bag-filled': { f: '<path d="M5.3 8.6a1 1 0 0 1 1-.9h11.4a1 1 0 0 1 1 .9l.9 11.1a1.6 1.6 0 0 1-1.6 1.7H6a1.6 1.6 0 0 1-1.6-1.7z"/>', s: '<path d="M9 9.6V7.2a3 3 0 0 1 6 0v2.4" stroke="#fff" stroke-width="1.6"/>' },
    'bag-line-handle': { s: '<path d="M5.2 8.6h13.6l-1 11.2a1.5 1.5 0 0 1-1.5 1.4H7.7a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M8.8 8.6V7a3.2 3.2 0 0 1 6.4 0v1.6"/>' },
    bell: { s: '<path d="M6.2 16.6v-5.4a5.8 5.8 0 0 1 11.6 0v5.4l1.6 2.1H4.6z"/><path d="M10 21.1a2.1 2.1 0 0 0 4 0"/><path d="M12 3.6v1.8"/>' },
    heart: { s: '<path d="M12 19.6S4.4 15 4.4 9.6A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.6 2.2c0 5.4-7.6 10-7.6 10z"/>' },
    'heart-filled': { f: '<path d="M12 20.3S3.6 15.3 3.6 9.5A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.4 2.9c0 5.8-8.4 10.8-8.4 10.8z"/>' },
    share: { s: '<path d="M12 3.4v11.4M7.9 7.4 12 3.4l4.1 4"/><path d="M8 10.3H6.4a1.5 1.5 0 0 0-1.5 1.5v7.4a1.5 1.5 0 0 0 1.5 1.5h11.2a1.5 1.5 0 0 0 1.5-1.5v-7.4a1.5 1.5 0 0 0-1.5-1.5H16"/>' },
    history: { s: '<path d="M4.4 12.2A7.6 7.6 0 1 0 6.6 6.8"/><path d="M4.2 3.8v4.1h4.1"/><path d="M12 8.1v4.3l2.9 1.8"/>' },
    home: { s: '<path d="M4.2 10.4 12 4.2l7.8 6.2v8.6a1.6 1.6 0 0 1-1.6 1.6H5.8a1.6 1.6 0 0 1-1.6-1.6z"/><path d="M9.6 20.6v-4.7a2.4 2.4 0 0 1 4.8 0v4.7"/>' },
    grid: { s: '<rect x="4.2" y="4.2" width="6.4" height="6.4" rx="1.6"/><rect x="13.4" y="4.2" width="6.4" height="6.4" rx="1.6"/><rect x="4.2" y="13.4" width="6.4" height="6.4" rx="1.6"/><rect x="13.4" y="13.4" width="6.4" height="6.4" rx="1.6"/>' },
    wardrobe: { s: '<rect x="5" y="3.6" width="14" height="16.4" rx="1.6"/><path d="M12 3.6V20M10 10.4v2.4M14 10.4v2.4M7 20v1M17 20v1"/>' },
    'wardrobe-filled': { f: '<path d="M4.2 9.2A2.2 2.2 0 0 1 6.4 7h11.2a2.2 2.2 0 0 1 2.2 2.2v9.6a2.2 2.2 0 0 1-2.2 2.2H6.4a2.2 2.2 0 0 1-2.2-2.2z"/>', s: '<path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7"/><path d="m10.4 11.2 1.6 1.7 1.6-1.7" stroke="#fff" stroke-width="1.6"/>' },
    cart: { s: '<path d="M3.4 4.6h2.3l2.1 10.6h10l1.9-7.6H6.5"/><circle cx="9.3" cy="19" r="1.35"/><circle cx="16.6" cy="19" r="1.35"/>' },
    person: { s: '<circle cx="12" cy="8.2" r="3.9"/><path d="M4.6 20.4c.9-3.9 3.8-5.9 7.4-5.9s6.5 2 7.4 5.9z"/>' },
    sparkle: { s: '<path d="M12 3.2c.5 4.8 2.7 7.4 8.6 8.8-5.9 1.4-8.1 4-8.6 8.8-.5-4.8-2.7-7.4-8.6-8.8 5.9-1.4 8.1-4 8.6-8.8z"/>' },
    'sparkle-duo': { f: '<path d="M10.4 3c.5 4.6 2.5 7 7.8 8.2-5.3 1.2-7.3 3.6-7.8 8.2-.5-4.6-2.5-7-7.8-8.2C7.9 10 9.9 7.6 10.4 3z"/><path d="M18.6 14.6c.2 1.8 1 2.7 3.1 3.2-2.1.5-2.9 1.4-3.1 3.2-.2-1.8-1-2.7-3.1-3.2 2.1-.5 2.9-1.4 3.1-3.2z"/>' },
    'sparkle-filled': { f: '<path d="M12 2.6c.5 5 2.8 7.6 8.9 9.1-6.1 1.5-8.4 4.1-8.9 9.1-.5-5-2.8-7.6-8.9-9.1 6.1-1.5 8.4-4.1 8.9-9.1z"/>' },
    tshirt: { s: '<path d="M8.6 4.2 4 6.8l1.9 4 2.1-.9v10.1h8V9.9l2.1.9 1.9-4-4.6-2.6c-.6 1.3-1.9 2.1-3.4 2.1s-2.8-.8-3.4-2.1z"/>' },
    'tshirt-filled': { f: '<path d="M8.4 3.6 3.3 6.5l2.3 4.7 2-.8V20a.6.6 0 0 0 .6.6h7.6a.6.6 0 0 0 .6-.6v-9.6l2 .8 2.3-4.7-5.1-2.9c-.6 1.4-2 2.3-3.6 2.3s-3-.9-3.6-2.3z"/>' },
    pants: { s: '<path d="M6.6 3.6h10.8l1.1 16.8h-4.4L12 9.8l-2.1 10.6H5.5z"/><path d="M6.5 6.6h11M9.2 3.6v3M14.8 3.6v3"/>' },
    'pants-filled': { f: '<path d="M6 3.2h12l1.2 17.6h-5.6L12 11.5l-1.6 9.3H4.8z"/>' },
    dress: { s: '<path d="M9.3 3.4v3.4L7.4 10 5 20.6h14L16.6 10l-1.9-3.2V3.4"/><path d="M9.3 6.8c1.5 1 3.9 1 5.4 0"/>' },
    'dress-filled': { f: '<path d="M8.8 3h1.4v3.2c1.1.7 2.5.7 3.6 0V3h1.4v3.6l2 3.3 2.5 11.3H4.3l2.5-11.3 2-3.3z"/>' },
    jacket: { s: '<path d="M8.4 3.8 4.6 6.2 3.8 20.2h4.6M15.6 3.8l3.8 2.4.8 14H15.6"/><path d="M8.4 3.8 12 6.6l3.6-2.8M12 6.6v13.6M8.4 20.2h7.2M8.4 3.8v16.4M15.6 3.8v16.4"/><path d="M9.6 12.4h1.2M13.2 12.4h1.2"/>' },
    'jacket-filled': { f: '<path d="M8.2 3.2 12 6l3.8-2.8 4.2 2.6.9 15H3.1l.9-15z"/>' },
    sneaker: { s: '<path d="M3.6 16.4V8.8c2 .1 3.6-.8 4.6-2.6l2.2 1.2c1.4 2.1 3.6 3.4 6.3 3.9 2.5.5 3.8 1.9 3.8 3.7v1.4z"/><path d="M3.6 16.4h16.9v1.3a1 1 0 0 1-1 1H4.6a1 1 0 0 1-1-1z"/><path d="m9.4 10.1 1.6-1.1M11.3 11.8l1.6-1.1"/>' },
    'sneaker-filled': { f: '<path d="M3 16.2V8.2c2.2.2 4-.8 5-2.7l2.8 1.5c1.3 2 3.4 3.3 6 3.8 2.8.5 4.2 2.1 4.2 4.1v1.3z"/><path d="M3 17.6h18v.6a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 18.2z"/>' },
    handbag: { s: '<path d="M5.2 9.2h13.6l-1.1 11.2H6.3z"/><path d="M8.6 9.2V7.6a3.4 3.4 0 0 1 6.8 0v1.6"/>' },
    'handbag-filled': { f: '<path d="M4.6 8.8h14.8L18.2 21H5.8z"/>', s: '<path d="M8.6 8.8V7.4a3.4 3.4 0 0 1 6.8 0v1.4"/>' },
    cap: { s: '<path d="M5.6 14.4a6.6 6.6 0 0 1 13.2 0z"/><path d="M5.6 14.4C4 14.6 3.3 15.5 3.6 16.8c.2.8 1 1.2 1.8 1.2h7.8c2.6 0 4.3-1.1 5.6-3.6"/><path d="M12.2 7.8V6.8"/>' },
    'cap-filled': { f: '<path d="M5 14.2a7.2 7.2 0 0 1 14.4 0z"/><path d="M4.6 15.3h14.3c-1.4 2.5-3.2 3.5-5.8 3.5H5.3c-1.1 0-2-.5-2.1-1.5-.1-1 .5-1.8 1.4-2z"/>' },
    'dress-hanger': { s: '<path d="M12 4.6a1.3 1.3 0 1 1 1.3 1.3H12v1.6"/><path d="M9.7 7.5h4.6l-.6 3.2 4.3 9.8H6l4.3-9.8z"/><path d="M10.3 10.7h3.4"/>' },
    hanger: { s: '<path d="M10.2 6.3a1.9 1.9 0 1 1 2.9 1.6c-.7.4-1.1.8-1.1 1.6v.5l8.3 5.6a1 1 0 0 1-.6 1.8H4.3a1 1 0 0 1-.6-1.8L12 10"/>' },
    star: { f: '<path d="m12 3.6 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8L8 13.6 3.7 9.6l5.8-.7z"/>' },
    pin: { s: '<path d="M12 20.8s-6.4-5.5-6.4-10.8a6.4 6.4 0 0 1 12.8 0c0 5.3-6.4 10.8-6.4 10.8z"/><circle cx="12" cy="10" r="2.4"/>' },
    truck: { s: '<path d="M2.8 6.4h10.8v9.8H2.8z"/><path d="M13.6 9.2h3.9l3 3.6v3.4h-6.9"/><circle cx="6.6" cy="17.4" r="1.8"/><circle cx="16.8" cy="17.4" r="1.8"/>' },
    card: { s: '<rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.2"/><path d="M3.2 9.8h17.6"/>' },
    'card-bold': { s: '<rect x="2.6" y="5" width="18.8" height="14" rx="2.4"/><path d="M2.6 9.6h18.8"/>' },
    receipt: { s: '<rect x="5" y="3.6" width="14" height="16.8" rx="2.4"/><path d="M8.6 9h6.8M8.6 12.6h6.8M8.6 16.2h3.8"/>' },
    doc: { s: '<rect x="5" y="3.6" width="14" height="16.8" rx="2.4"/><path d="M8.6 9.4h6.8M8.6 13.4h4.4"/>' },
    headset: { s: '<path d="M4.6 14.2v-2.4a7.4 7.4 0 0 1 14.8 0v2.4"/><rect x="3.4" y="12.8" width="3.6" height="5.6" rx="1.5"/><rect x="17" y="12.8" width="3.6" height="5.6" rx="1.5"/><path d="M18.8 18.4c0 1.6-1.5 2.4-4 2.4h-1.4"/>' },
    'chat-dots': { s: '<path d="M4 6.6A2.6 2.6 0 0 1 6.6 4h10.8A2.6 2.6 0 0 1 20 6.6v7.8a2.6 2.6 0 0 1-2.6 2.6h-6.2L7 20.4V17h-.4A2.6 2.6 0 0 1 4 14.4z"/>', f: '<circle cx="8.6" cy="10.6" r="1.05"/><circle cx="12" cy="10.6" r="1.05"/><circle cx="15.4" cy="10.6" r="1.05"/>' },
    refresh: { s: '<path d="M19.4 9.6A7.8 7.8 0 0 0 5.6 7.4L4.4 8.8M4.4 4.6v4.2h4.2"/><path d="M4.6 14.4a7.8 7.8 0 0 0 13.8 2.2l1.2-1.4M19.6 19.4v-4.2h-4.2"/>' },
    question: { s: '<circle cx="12" cy="12" r="8.6"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9"/>', f: '<circle cx="12" cy="17.1" r="1.05"/>' },
    upload: { s: '<path d="M12 15.4V4.6M7.6 8.8 12 4.4l4.4 4.4"/><path d="M4.6 14.8v3a2.2 2.2 0 0 0 2.2 2.2h10.4a2.2 2.2 0 0 0 2.2-2.2v-3"/>' },
    image: { s: '<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2.4"/><circle cx="9" cy="10" r="1.6"/><path d="m20.4 15.8-4.8-4.8-8.6 8.4"/>' },
    camera: { s: '<path d="M4 8.6A1.6 1.6 0 0 1 5.6 7h2.2l1.5-2.1h5.4L16.2 7h2.2A1.6 1.6 0 0 1 20 8.6v9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6z"/><circle cx="12" cy="12.8" r="3.3"/>' },
    video: { s: '<rect x="2.8" y="6.2" width="13.6" height="11.6" rx="2.4"/><path d="m16.4 10.5 3.8-2.4c.5-.3 1.1 0 1.1.6v6.6c0 .6-.6.9-1.1.6l-3.8-2.4"/>' },
    /* 创建数字分身 (avatar onboarding): drawn after the onboarding asset kit's icons */
    'play-filled': { f: '<path d="M8.6 5.6a1 1 0 0 1 1.5-.86l9.2 5.5a1 1 0 0 1 0 1.72l-9.2 5.5a1 1 0 0 1-1.5-.86z"/>' },
    rotate: { s: '<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4.6v6.4h-6.4"/>' },
    sun: { s: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.6v2.2M12 19.2v2.2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2.6 12h2.2M19.2 12h2.2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/>' },
    'shield-check': { s: '<path d="M12 2.8 19.6 6.4v5.4c0 4.7-3.6 7.6-7.6 9.4-4-1.8-7.6-4.7-7.6-9.4V6.4z"/><path d="m8.6 12 2.4 2.4 4.6-4.8"/>' },
    'alert-circle': { s: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.4v5.4M12 16.4h.01"/>' },
    'check-circle': { s: '<circle cx="12" cy="12" r="8.8"/><path d="m8.2 12.2 2.6 2.6 5-5.2"/>' },
    'person-standing': { s: '<circle cx="12" cy="4.4" r="2"/><path d="M12 6.8v7.4M7.2 9.4 12 11l4.8-1.6M12 14.2l-3.6 7.2M12 14.2l3.6 7.2"/>' },
    clock: { s: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.2V12l3.4 2"/>' },
    bulb: { s: '<path d="M9 17.6h6M9.8 20.6h4.4"/><path d="M8.2 14.4a6.2 6.2 0 1 1 7.6 0c-.7.6-1 1.4-1 2.2v1H9.2v-1c0-.8-.3-1.6-1-2.2z"/>' },
    'video-filled': { f: '<path d="M2.6 8.2a2.2 2.2 0 0 1 2.2-2.2h9.4a2.2 2.2 0 0 1 2.2 2.2v7.6a2.2 2.2 0 0 1-2.2 2.2H4.8a2.2 2.2 0 0 1-2.2-2.2z"/><path d="m17.4 10.4 3.4-2.3c.5-.3 1 0 1 .6v6.6c0 .6-.5.9-1 .6l-3.4-2.3z"/>' },
    'switch-camera': { s: '<path d="M4 8.6A1.6 1.6 0 0 1 5.6 7h2.2l1.5-2.1h5.4L16.2 7h2.2A1.6 1.6 0 0 1 20 8.6v9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6z"/><path d="M15 12a3 3 0 0 0-5.2-2M9 13.6a3 3 0 0 0 5.2 2M9.6 8.6v1.6h1.6M14.4 17v-1.6h-1.6"/>' },
    trash: { s: '<path d="M4.8 7h14.4M9.6 7V5.2h4.8V7M6.6 7l.8 12.4a1.6 1.6 0 0 0 1.6 1.4h6a1.6 1.6 0 0 0 1.6-1.4L17.4 7"/>' },
    copy: { s: '<rect x="8.4" y="8.4" width="11.6" height="11.6" rx="2"/><path d="M15.6 8.4V6A2 2 0 0 0 13.6 4H6A2 2 0 0 0 4 6v7.6a2 2 0 0 0 2 2h2.4"/>' },
    phone: { s: '<path d="M7.2 3.8h2.6l1.4 4-2 1.3a10.4 10.4 0 0 0 5.7 5.7l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A16 16 0 0 1 5.2 6a2 2 0 0 1 2-2.2z"/>' },
    lock: { s: '<rect x="5" y="10.4" width="14" height="10" rx="2.2"/><path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6"/>' },
    info: { s: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4"/>', f: '<circle cx="12" cy="7.9" r="1.05"/>' },
    ruler: { s: '<path d="m3.8 15.6 11.8-11.8 4.6 4.6L8.4 20.2z"/><path d="m7.4 12 1.8 1.8M10 9.4l1.8 1.8M12.6 6.8l1.8 1.8"/>' },
    gift: { s: '<rect x="4" y="9" width="16" height="11.4" rx="1.6"/><path d="M3.4 9h17.2M12 9v11.4M12 9c-1.6-3.6-6-4-6-1.6C6 9 9.6 9 12 9zM12 9c1.6-3.6 6-4 6-1.6C18 9 14.4 9 12 9z"/>' },
    more: { f: '<circle cx="5.6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.4" cy="12" r="1.6"/>' },
    mic: { s: '<rect x="9" y="3.6" width="6" height="10.4" rx="3"/><path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0M12 17.6v2.8"/>' },
    logout: { s: '<path d="M14.4 4.6H18a1.6 1.6 0 0 1 1.6 1.6v11.6A1.6 1.6 0 0 1 18 19.4h-3.6M10 16.4 14.4 12 10 7.6M14.4 12H4.4"/>' },
    reset: { s: '<path d="M4.6 12a7.4 7.4 0 1 0 2.4-5.4"/><path d="M4.4 3.6v4.2h4.2"/>' },
    /* — 5-tab navigation (filled = active tab) — */
    'home-filled': { f: '<path d="M3.6 10.3a1 1 0 0 1 .4-.8l7.4-5.9a1 1 0 0 1 1.2 0l7.4 5.9a1 1 0 0 1 .4.8v8.9a1.8 1.8 0 0 1-1.8 1.8h-3.8v-5a2.8 2.8 0 0 0-5.6 0v5H5.4a1.8 1.8 0 0 1-1.8-1.8z"/>' },
    'closet-filled': { f: '<path d="M4.4 5.2a2.4 2.4 0 0 1 2.4-2.4h4.4v17.6H6.8a2.4 2.4 0 0 1-2.4-2.4zM12.8 2.8h4.4a2.4 2.4 0 0 1 2.4 2.4V18a2.4 2.4 0 0 1-2.4 2.4h-4.4z"/><path d="M6.4 20.2h2v1.4h-2zM15.6 20.2h2v1.4h-2z"/>', s: '<path d="M9.6 10.4v2.4M14.4 10.4v2.4" stroke="#fff" stroke-width="1.6"/>' },
    'person-filled': { f: '<circle cx="12" cy="8" r="4.3"/><path d="M3.8 20c.8-4.4 4-6.6 8.2-6.6s7.4 2.2 8.2 6.6a.9.9 0 0 1-.9 1H4.7a.9.9 0 0 1-.9-1z"/>' },
    /* — 我的 / profile & settings — */
    settings: { s: '<path d="M10.08 5.06L10.32 2.95A9.2 9.2 0 0 1 13.68 2.95L13.92 5.06A7.2 7.2 0 0 1 15.55 5.73L17.21 4.42A9.2 9.2 0 0 1 19.58 6.79L18.27 8.45A7.2 7.2 0 0 1 18.94 10.08L21.05 10.32A9.2 9.2 0 0 1 21.05 13.68L18.94 13.92A7.2 7.2 0 0 1 18.27 15.55L19.58 17.21A9.2 9.2 0 0 1 17.21 19.58L15.55 18.27A7.2 7.2 0 0 1 13.92 18.94L13.68 21.05A9.2 9.2 0 0 1 10.32 21.05L10.08 18.94A7.2 7.2 0 0 1 8.45 18.27L6.79 19.58A9.2 9.2 0 0 1 4.42 17.21L5.73 15.55A7.2 7.2 0 0 1 5.06 13.92L2.95 13.68A9.2 9.2 0 0 1 2.95 10.32L5.06 10.08A7.2 7.2 0 0 1 5.73 8.45L4.42 6.79A9.2 9.2 0 0 1 6.79 4.42L8.45 5.73A7.2 7.2 0 0 1 10.08 5.06Z"/><circle cx="12" cy="12" r="3.1"/>' },
    wallet: { s: '<rect x="3.8" y="5.6" width="16.4" height="13.6" rx="2.4"/><path d="M3.8 9.8h16.4M10.2 14.6h3.6"/>' },
    box: { s: '<rect x="4" y="7.8" width="16" height="12.4" rx="2.4"/><path d="M8.8 7.8V6.2a1.8 1.8 0 0 1 1.8-1.8h2.8a1.8 1.8 0 0 1 1.8 1.8v1.6M9.4 12.6v.4M14.6 12.6v.4"/>' },
    'box-check': { s: '<path d="M4 8.2 12 4.2l8 4v8.2l-8 4-8-4z"/><path d="M4 8.2l8 4 8-4M12 12.2v8.2"/>' },
    aftersale: { s: '<circle cx="12" cy="12" r="8.6"/><path d="M8.6 11.2a3.6 3.6 0 1 1 1 3.2"/><path d="M8.4 8.6v2.8h2.8"/>' },
    figure: { s: '<circle cx="12" cy="7.4" r="3.4"/><path d="M6.2 20.6c.3-4.6 2.6-7.4 5.8-7.4s5.5 2.8 5.8 7.4"/><path d="M9.6 13.8 12 16.4l2.4-2.6"/>' },
    shield: { s: '<path d="M12 3.4 5 6.2v5.4c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6.2z"/><path d="m9 12 2.2 2.2 3.8-4"/>' },
    globe: { s: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.3 2.4 3.5 5.3 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.3-3.5-8.6S9.7 5.8 12 3.4z"/>' },
    edit: { s: '<path d="M4.6 19.4h3.4L18.6 8.8a2.4 2.4 0 0 0-3.4-3.4L4.6 16z"/><path d="m13.8 6.8 3.4 3.4"/>' },
    download: { s: '<path d="M12 4.4v10.8M7.6 11 12 15.4l4.4-4.4"/><path d="M4.6 15v3a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-3"/>' },
    store: { s: '<path d="M4.2 9.2 5.6 4.6h12.8l1.4 4.6"/><path d="M4.2 9.2a2.6 2.6 0 0 0 5.2.4 2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2-.4"/><path d="M5.4 11.8v7.8h13.2v-7.8M10 19.6v-4h4v4"/>' },
    moon: { s: '<path d="M19.4 14.6A7.8 7.8 0 0 1 9.4 4.6a7.8 7.8 0 1 0 10 10z"/>' },
    showcase: { s: '<rect x="2.8" y="5.2" width="4.6" height="13.6" rx="1.2"/><rect x="9.7" y="5.2" width="4.6" height="13.6" rx="1.2"/><rect x="16.6" y="5.2" width="4.6" height="13.6" rx="1.2"/>' },
    phoneframe: { s: '<rect x="6.4" y="2.8" width="11.2" height="18.4" rx="2.6"/><path d="M10.6 5.4h2.8"/>' },
  };

  /**
   * icon('heart', { size: 22, stroke: 1.6, cls: 'x' }) -> SVG markup
   */
  function icon(name, opts) {
    const o = opts || {};
    const def = P[name];
    if (!def) { console.warn('[icons] missing', name); return ''; }
    const size = o.size || 24;
    const sw = o.stroke || 1.7;
    const strokePart = def.s ? `<g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${def.s}</g>` : '';
    const fillPart = def.f ? `<g fill="currentColor" stroke="none">${def.f}</g>` : '';
    // filled shapes first so strokes (handles, white details) sit on top
    return `<svg class="i i-${name}${o.cls ? ' ' + o.cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${fillPart}${strokePart}</svg>`;
  }

  /* iOS-style status bar glyphs (signal / wifi / battery) */
  const statusGlyphs =
    '<svg class="sb-signal" width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="0.8"/><rect x="5" y="5.6" width="3" height="6.4" rx="0.8"/><rect x="10" y="3" width="3" height="9" rx="0.8"/><rect x="15" y="0" width="3" height="12" rx="0.8"/></svg>' +
    '<svg class="sb-wifi" width="17" height="12" viewBox="0 0 17 12" aria-hidden="true"><path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1.3-1.3A10.6 10.6 0 0 0 8.5.4 10.6 10.6 0 0 0 .9 3.5l1.3 1.3a9 9 0 0 1 6.3-2.5z"/><path d="M8.5 5.9c1.4 0 2.7.5 3.7 1.4l1.3-1.3a7.1 7.1 0 0 0-10 0l1.3 1.3c1-.9 2.3-1.4 3.7-1.4z"/><path d="M8.5 9.3c.5 0 1 .2 1.3.5L8.5 11.6 7.2 9.8c.3-.3.8-.5 1.3-.5z"/></svg>' +
    '<svg class="sb-battery" width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x="0.6" y="0.6" width="22.6" height="11.8" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1.1"/><rect x="2.2" y="2.2" width="19.4" height="8.6" rx="2.2"/><path d="M24.6 4.4v4.2c.9-.3 1.5-1.2 1.5-2.1s-.6-1.8-1.5-2.1z" fill-opacity=".45"/></svg>';

  VT.icon = icon;
  VT.iconNames = Object.keys(P);
  VT.statusGlyphs = statusGlyphs;
})();
