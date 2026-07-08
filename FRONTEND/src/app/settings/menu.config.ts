
export const MENU_CONFIG = [
  {
    title: 'Inicio',
    icon: 'bi bi-house',
    route: '/',
  },
  {
    title: 'ATS', 
    img: '/assets/images/ats.png',
    route: '//ats',
    permission: 6,
  },
  {
    title: 'Orden de Pago',
    icon: '	bi bi-file-earmark-text ',
    submenus: [
      { title: 'Cheques', route: '/ordp-cheques', img: '/assets/images/cheque.png', permission: 8 },
      { title: 'Transacciones', route: '/ordp-transacciones', img: '/assets/images/transaccion.png', permission: 8 },
    ]
  },
  {
    title: 'Gestión de Usuarios',
    icon: 'bi bi-people',
    route: '//usuario',
    permission: 5,
  },
];
