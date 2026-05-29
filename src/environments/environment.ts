/**
 * Archivo de configuración de entorno para el entorno de desarrollo y producción básico.
 * 
 * NOTA DE SEGURIDAD: Dado que este es un proyecto frontend (Angular compilado para navegador),
 * los valores definidos aquí se compilarán e inyectarán en los bundles de JS públicos.
 * 
 * Si deseas configurar estos valores dinámicamente o mantenerlos fuera del repositorio Git:
 * 1. Agrega este archivo al archivo `.gitignore`.
 * 2. Define claves en este archivo que lean variables de entorno del proceso de build (por ejemplo, mediante scripts de build personalizados o inyecciones Webpack/esbuild).
 * 3. En el dashboard de Vercel (Project Settings -> Environment Variables), configura los valores
 *    para inyectarlos durante el build con scripts.
 */
// Declaración para evitar errores de compilación de TypeScript
declare const process: any;

// Mapeo o mock de process para evitar fallos en el navegador (entorno cliente)
if (typeof globalThis !== 'undefined') {
  (globalThis as any).process = (globalThis as any).process || { env: {} };
}

export const environment = {
  production: false,
  emailjsServiceId: process.env['NG_APP_EMAILJS_SERVICE_ID'] || 'service_pjnea6l',
  emailjsTemplateId: process.env['NG_APP_EMAILJS_TEMPLATE_ID'] || 'template_s3uhxmt',
  emailjsPublicKey: process.env['NG_APP_EMAILJS_PUBLIC_KEY'] || 'tjptuMbl0rhyI7s52'
};
