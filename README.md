# JardineriaNorat

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.12.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Configuración de Seguridad y Despliegue en Vercel

Para que el formulario de contacto funcione correctamente en producción utilizando EmailJS y esté protegido con las mejores prácticas de seguridad, se deben realizar los siguientes pasos de configuración:

### 1. Variables de Entorno en Vercel
Añade las siguientes tres variables de entorno en el panel de control de Vercel (**Settings > Environment Variables**) de tu proyecto con sus valores correspondientes para inyectarlos en la compilación:

* **`NG_APP_EMAILJS_SERVICE_ID`**: ID del servicio de EmailJS (ej. `service_xxxxxxx`).
* **`NG_APP_EMAILJS_TEMPLATE_ID`**: ID de la plantilla de correo de EmailJS (ej. `template_xxxxxxx`).
* **`NG_APP_EMAILJS_PUBLIC_KEY`**: Clave pública de la cuenta de EmailJS (ej. `xxxxxxxxxxxxxxxxx`).

*Nota: El archivo `src/environments/environment.ts` ya cuenta con los mocks seguros en el cliente y valores por defecto para que la aplicación funcione de forma inmediata en entornos locales sin fallos de ejecución.*

### 2. Cabeceras de Seguridad
El archivo `vercel.json` configurado en la raíz del proyecto inyecta de forma automática cabeceras HTTP robustas de seguridad (como protección anti-clickjacking `X-Frame-Options` y restricción de políticas de permisos a APIs de hardware del usuario).

"# Jardineria-Norat" 
