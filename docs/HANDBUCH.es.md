# Gestión de Dispositivos — Manual de usuario

Versión: v3.1.1 · 2026-10-06

Este manual describe la instalación y el uso de la Gestión de Dispositivos y responde a las preguntas más frecuentes del foro. ¿Es nuevo? Empiece por el primer capítulo y el inicio rápido. Si ya conoce una versión anterior, vaya directamente al capítulo que le plantee dudas.

---

## Contenido

1. [Para qué sirve la Gestión de Dispositivos](#para-qué-sirve-la-gestión-de-dispositivos)
2. [Instalación, actualización, desinstalación](#instalación-actualización-desinstalación)
3. [Free y Pro](#free-y-pro)
4. [Inicio rápido en 5 pasos](#inicio-rápido-en-5-pasos)
5. [Registrar dispositivos](#registrar-dispositivos)
6. [Integración con Home Assistant (MQTT-Discovery)](#integración-con-home-assistant-mqtt-discovery)
7. [Dispositivos multicanal (Parent-Child)](#dispositivos-multicanal-parent-child)
8. [Fusionar dispositivos duplicados](#fusionar-dispositivos-duplicados)
9. [Seguro & herencia — los flujos de trabajo típicos](#seguro--herencia--los-flujos-de-trabajo-típicos)
10. [Importar Excel](#importar-excel)
11. [Filtro, búsqueda y orden](#filtro-búsqueda-y-orden)
12. [Papelera & instantáneas de la base de datos](#papelera--instantáneas-de-la-base-de-datos)
13. [Preguntas frecuentes (FAQ)](#preguntas-frecuentes-faq)
14. [Solución de problemas](#solución-de-problemas)
15. [Protección de datos y aspectos legales](#protección-de-datos-y-aspectos-legales)
16. [Soporte y contacto](#soporte-y-contacto)

---

## Para qué sirve la Gestión de Dispositivos

Un hogar inteligente crece: routers, sensores, enchufes, cámaras, termostatos, gateways. ¿Dónde está el número de serie del repetidor, cuándo se compró el termostato, sigue vigente la garantía, qué interruptor de luz está puenteado? La Gestión de Dispositivos es una lista de inventario con búsqueda de todos los dispositivos de la casa, directamente en Home Assistant.

Usos típicos:

- **Seguro** — inventario con números de serie, fechas de compra, fotos y comprobantes; en caso de siniestro, todo a mano.
- **Garantía** — fecha de compra y fin de garantía de cada dispositivo.
- **Mantenimiento** — firmware, dirección IP y MAC, red e integración de un vistazo.
- **Traspaso, desmontaje, herencia** — la lista para familiares, electricistas o compradores: qué funciona sin Home Assistant, qué interruptores están puenteados, dónde están los documentos.
- **Alquiler e impuestos** — documentar el equipamiento de viviendas de alquiler o los dispositivos de uso profesional.

La app funciona como complemento de Home Assistant con base de datos propia, se puede usar en móvil, tableta y PC y funciona también sin conexión; los cambios se sincronizan en cuanto vuelve la conexión.

---

## Instalación, actualización, desinstalación

**Requisitos:** Home Assistant OS o Supervised (debe existir el menú *Aplicaciones*, antes *Complementos*), arquitectura amd64, aarch64 (p. ej. Raspberry Pi 4/5) o armv7, un navegador actual. La cámara y el escáner de códigos de barras necesitan una conexión cifrada (HTTPS), consulte [Cámara y escáner](#cámara-y-escáner).

**Instalar:**

1. En Home Assistant **Configuración → Aplicaciones** (en versiones anteriores **Complementos**) → abajo a la derecha **Instalar aplicación**. Se abre la **Tienda de aplicaciones**.
2. Arriba a la derecha, el menú de tres puntos → **Repositorios**.
3. Pegue `https://github.com/DerRegner-DE/ha-device-inventory`, **Añadir**, cierre el diálogo.
4. En la tienda, busque **Geraeteverwaltung** (si es necesario, recargue la página) → **Instalar**.
5. **Iniciar**, active **Mostrar en el panel lateral**, **Open Web UI**.

**Actualizar:** Home Assistant muestra una actualización disponible en *Configuración → Aplicaciones → Geräteverwaltung* (y en las notificaciones). Haga clic en **Actualizar**; se recomienda dejar activado *Crea una copia de seguridad antes de actualizar*, porque las actualizaciones pueden ampliar la base de datos. Como alternativa, active *Actualización automática*. Las novedades figuran en el registro de cambios (Changelog) del complemento. Tras una actualización, conviene revisar el apartado «Tras la actualización» del inicio rápido.

**Desinstalar:** *Configuración → Aplicaciones → Geräteverwaltung → Desinstalar*. Home Assistant borra entonces el directorio de datos del complemento con la base de datos, las fotos y la licencia. Haga antes una copia: *Ajustes → Exportar Datos* (JSON; Excel y PDF con Pro) o una copia de seguridad de Home Assistant que incluya el complemento.

---

## Free y Pro

Las funciones básicas son gratuitas; las funciones avanzadas se desbloquean con una clave de licencia de pago único (**9,99 €**, sin suscripción).

| | Free | Pro |
|---|:---:|:---:|
| Registrar dispositivos a mano, todas las secciones básicas del formulario | hasta 50 | ilimitados |
| Idiomas | Inglés | Alemán, inglés, español, francés, ruso |
| Panel, búsqueda, filtros, orden, «Solo principales», modo sin conexión, barra lateral, modo oscuro | ✓ | ✓ |
| Categorías propias, exportación JSON | ✓ | ✓ |
| Fusionar dispositivos duplicados, limpiar autoimportaciones | ✓ | ✓ |
| Papelera, instantáneas de la base de datos, historial de cambios | ✓ | ✓ |
| Desactivar MQTT, «Limpiar entradas huérfanas», «Eliminar todas las entradas MQTT» | ✓ | ✓ |
| Ver las fotos, fotos de instalación, documentos y datos de traspaso existentes | ✓ | ✓ |
| Importación de HA, recategorizar dispositivos | — | ✓ |
| Exportación a PDF y Excel con plantillas, orden e imágenes en el PDF; importar Excel | — | ✓ |
| Cámara, escáner QR/código de barras, foto del dispositivo | — | ✓ |
| Subir, enlazar y borrar documentos | — | ✓ |
| Añadir y borrar fotos de instalación | — | ✓ |
| Editar los campos de traspaso («¿Funciona sin Home Assistant?», «¿Interruptor de pared puenteado?», «Enlace externo») | — | ✓ |
| Edición en lote (*Seleccionar*) | — | ✓ |
| Activar MQTT, «Probar conexión MQTT», «Sincronizar todos los dispositivos ahora» (y con ello los sensores en HA y el enlace *Visitar*) | — | ✓ |

Lo que ya está registrado sigue visible sin licencia, y MQTT se puede desactivar y limpiar en cualquier momento. Así no quedan restos si Pro deja de estar activo.

Sin licencia, los botones Pro aparecen en gris, llevan el añadido «(Pro)» y no reaccionan ni al clic ni al pasar el ratón. En Ajustes, desde la 3.1.1 debajo aparece el aviso «Función Pro: introduce la clave de licencia en Ajustes → Licencia.» con el enlace **Comprar Pro – 9,99 €**.

**Comprar:** mediante el enlace del README del repositorio de GitHub; la clave llega por correo electrónico con la confirmación de compra. Una clave vale para hasta tres instalaciones y no caduca.

**Activar:** *Ajustes → Licencia*, introduzca la clave en el campo *Clave de licencia*, **Activar**. Las funciones Pro quedan disponibles al instante. Al activar y de vez en cuando después, el complemento comprueba la clave con el proveedor de pagos Lemon Squeezy; sin Internet sigue valiendo la última comprobación correcta.

Si tras la compra no llega ningún correo: revise la carpeta de spam; si no, escriba a support@derregner.info.

---

## Inicio rápido en 5 pasos

1. **Instale el complemento** como se describe en [Instalación, actualización, desinstalación](#instalación-actualización-desinstalación). Tras la instalación, la Gestión de Dispositivos aparece como entrada en la barra lateral de HA.
2. **Active la licencia Pro** en *Ajustes → Licencia*. Sin licencia se pueden gestionar a mano hasta 50 dispositivos y la interfaz está en inglés. Son Pro, entre otras cosas, la importación de HA, los demás idiomas, la exportación a PDF/Excel, MQTT, la cámara, el escáner, los documentos, las fotos de instalación, los campos de traspaso y la edición en lote; la lista completa figura en [Free y Pro](#free-y-pro).
3. **Importe los dispositivos de HA** (Pro) en *Ajustes → Importar Home Assistant → Importar dispositivos HA*. En instalaciones grandes (300+) la importación puede tardar un minuto; se ejecuta en segundo plano con indicador de progreso. Se importan nombre, fabricante, modelo, firmware, habitación y planta, integración, red y, desde la 3.1.0, número de serie, dirección MAC y alimentación (batería/recargable), siempre que Home Assistant los conozca. Una nueva importación no duplica dispositivos y, en los dispositivos existentes, solo completa el número de serie y la MAC en campos vacíos. Mientras no haya ningún dispositivo registrado, el panel y la lista de dispositivos ofrecen el botón **Importar desde Home Assistant** junto a **Añadir primer dispositivo**; lleva directamente a esta sección (desde la 3.1.1).
4. **Opcional: active MQTT-Discovery** (Pro) en *Ajustes → Integración Home Assistant → Publicar dispositivos en HA*. Si tiene sentido o no, se explica en el capítulo [Integración con Home Assistant](#integración-con-home-assistant-mqtt-discovery).
5. **Complete los primeros dispositivos**: toque un dispositivo de la lista, luego *Editar*, e introduzca como mínimo *Fecha de Compra* y *Garantía hasta*, y el precio de compra en *Notas*. Con Pro, añada una foto y fotos de instalación y suba los comprobantes como documentos: listo para la documentación del seguro.

### Tras la actualización a 3.1.0

Una vez, en este orden:

1. *Ajustes → Importar Home Assistant → Importar dispositivos HA* (Pro): completa el número de serie y la MAC en los dispositivos existentes y deshace asignaciones erróneas a routers (consulte [Dispositivos multicanal](#dispositivos-multicanal-parent-child)).
2. *Ajustes → Posibles duplicados*: revise y fusione los dispositivos duplicados (consulte [Dispositivos duplicados](#fusionar-dispositivos-duplicados)).
3. *Ajustes → Recategorizar dispositivos → Vista previa y selección* (Pro): tras la 3.1.0 la vista previa muestra bastantes más propuestas que antes, porque la detección ve por primera vez las clases de dispositivo de Home Assistant. Además se completa la alimentación. Revise primero la vista previa, desmarque filas concretas y luego aplique. Todo se puede deshacer mediante la instantánea y el historial del dispositivo.

---

## Registrar dispositivos

Los dispositivos nuevos se crean con **Añadir** en la barra inferior; los existentes, desde la página de detalle → **Editar**. Solo son obligatorios *Tipo de Dispositivo* y *Nombre*. El formulario está dividido en secciones que se pueden desplegar y plegar:

| Sección | Campos |
|---|---|
| Datos Básicos | Tipo de Dispositivo, Nombre, Modelo, Fabricante, Firmware |
| Ubicación | Área de Home Assistant (la planta se deduce de ella) |
| Red y Energía | Red, Alimentación, Dirección IP, Dirección MAC |
| Detalles | Número de Serie, AIN / Nº Artículo, Fecha de Compra, Garantía hasta |
| Home Assistant | Integración, Entity ID, Device ID |
| Notas | Función, Notas, «¿Funciona sin Home Assistant?», «¿Interruptor de pared puenteado?», Enlace externo (editar los tres últimos: Pro) |

Al editar se añaden debajo **Fotos de instalación** (Pro; con descripción, p. ej. «detrás de la cubierta, arriba a la izquierda») y **Documentos** (Pro; factura, manual: como archivo o enlace). En la parte superior del formulario se puede tomar una foto del dispositivo (Pro) con el icono de la cámara o elegirla desde un archivo. Sin Pro siguen visibles las imágenes, documentos y datos de traspaso existentes; el formulario muestra entonces el aviso «Editar los campos de traspaso es una función Pro. Los datos existentes siguen visibles.» o «Añadir o borrar fotos de instalación es una función Pro.». Cada cambio queda en el *Historial de cambios* de la página de detalle y se puede revertir allí de forma individual.

**Integración** es un campo libre: la lista de sugerencias contiene las integraciones habituales y todas las que aparecen en su inventario; se puede escribir cualquier otro valor.

**Valores de selección:**

- *Red:* WiFi, LAN, Zigbee, Z-Wave, Bluetooth, Thread/Matter, DECT, Powerline, HomeMatic RF, KNX, Modbus, 1-Wire, RS-232, EnOcean, USB
- *Alimentación:* Adaptador, 230V, Batería, Recargable, USB, PoE, Solar, Alta Tensión
- *Tipos de dispositivo (32):* Router, Repetidor, Powerline, Repetidor DECT, Enchufe, Interruptor, Bombilla, Actuador/Relé, Interruptor/Pulsador, Persiana, Termostato, Controlador/Gateway, Cámara, Timbre, Campana, Cerradura, Sistema de Alarma, Asistente de Voz, Smart TV, Streaming, Pantalla/Dashboard, Tablet, Altavoz, Electrodoméstico, Robot Cortacésped, Riego, Ventilador, Mando a Distancia, Impresora, Sensor, Smartphone, Otros

Los tipos de dispositivo propios se crean en *Ajustes → Gestionar categorías*; después aparecen en todas las listas de selección, en la edición en lote (Pro) y como pestañas de filtro.

### Cámara y escáner

Con Pro se pueden tomar fotos directamente y escanear códigos QR y de barras. Una dirección MAC en el código se reconoce y se introduce; si no, el contenido va al formulario como número de serie. Los códigos estructurados (p. ej. `SN:…|MAC:…|MODEL:…`) rellenan varios campos a la vez. Los navegadores solo permiten la cámara a través de una conexión cifrada: mediante Home Assistant Cloud (Nabu Casa), un certificado propio o un proxy inverso. Con acceso mediante `http://<IP>:8123` se puede seguir eligiendo una imagen existente, pero no usar la cámara.

---

## Integración con Home Assistant (MQTT-Discovery)

Es, con diferencia, la pregunta más frecuente del foro. Explicamos **qué** hace el interruptor, **cuándo** tiene sentido y **cómo** deshacerse de él de forma limpia.

Activar, *Probar conexión MQTT* y *Sincronizar todos los dispositivos ahora* son Pro. Desactivar y los dos botones de limpieza funcionan siempre, también sin licencia.

### ¿Qué ocurre al activarlo?

Si activa *Publicar dispositivos en HA*, el complemento publica **hasta 6 entradas MQTT-Discovery por cada dispositivo del inventario** en el broker configurado en las opciones del complemento (por defecto: `core-mosquitto`):

| Tipo de entidad | Contenido | Ejemplo |
|------------|--------|----------|
| Sensor `*_warranty` | Fecha ISO hasta la que dura la garantía | `2027-03-15` |
| Sensor `*_warranty_days` | días restantes como número | `123` |
| Sensor `*_purchase` | Fecha de compra | `2024-09-12` |
| Sensor `*_type` | Tipo de dispositivo | `Router` |
| Sensor `*_location` | Ubicación | `Oficina 1.ª planta` |
| Sensor binario `*_warranty_active` | `on` mientras dure la garantía | `on` / `off` |

Estas entidades aparecen en HA en *Configuración → Dispositivos y servicios → MQTT*, con una tarjeta de dispositivo propia por cada entrada del inventario.

**Desde la 3.1.0**, el sensor `*_type` lleva además los datos registrados como atributos: ubicación, número de serie, alimentación, función, notas, «Funciona sin HA» e «Interruptor de pared puenteado» con sus notas, enlace externo y el número de fotos y fotos de instalación (atributos `fotos` y `einbauort_bilder`). Los valores vacíos se omiten. Los dos contadores también son correctos después de *Sincronizar todos los dispositivos ahora*; si añade o borra una foto o una foto de instalación, el nuevo número aparece en HA justo después. En automatizaciones se accede, p. ej., con `state_attr('sensor.landroid_s300_device_type', 'seriennummer')`.

**Volver a la app:** en la página de dispositivo de HA de cada dispositivo publicado así aparece el enlace **Visitar**. Abre directamente ese dispositivo en la Gestión de Dispositivos. Para dispositivos de otras integraciones (p. ej. la página de dispositivo original de un Shelly) un complemento no puede añadir un enlace; ahí solo se llega a través de la tarjeta MQTT de la entrada del inventario.

### Credenciales para el broker MQTT

**Para qué:** para publicar, la Gestión de Dispositivos debe iniciar sesión en el broker MQTT; el complemento Mosquitto solo admite participantes autenticados. Sin MQTT la app funciona por lo demás por completo; solo se ven afectados los sensores en HA y el enlace *Visitar*.

El complemento solicita primero las credenciales al Supervisor. Si el complemento Mosquitto las proporciona allí, no hay que introducir nada. Si, en cambio, la prueba en *Ajustes → Integración Home Assistant → Probar conexión MQTT* indica **«Not authorized»** (código 135), el complemento necesita un usuario. Lo más sencillo es un usuario propio de Home Assistant; el complemento Mosquitto acepta cualquier usuario de HA:

1. En Home Assistant, abajo a la izquierda, **Configuración** → **Personas** → abra arriba la pestaña **Usuarios** (visible para administradores; en versiones anteriores de HA solo tras activar **Modo avanzado** en el propio perfil).
2. Abajo a la derecha, **Añadir usuario**. **Nombre para mostrar** y **Nombre de usuario**, p. ej. `geraeteverwaltung`; defina la **Contraseña**.
3. Active **Solo local** y deje desactivado **Administrador**. **Crear**.
4. **Configuración** → **Aplicaciones** (en versiones anteriores **Complementos**) → **Geräteverwaltung** → pestaña **Configuración**.
5. En **mqtt_user** introduzca el nombre de usuario y en **mqtt_password** la contraseña. **Guardar**; después, arriba en la pestaña **Información**, **Reiniciar**.
6. En la Gestión de Dispositivos, *Probar conexión MQTT*: ahora debería aparecer «OK».

Por qué un usuario propio en lugar de su cuenta: no tiene derechos de administrador, solo inicia sesión en la red doméstica y en la configuración del complemento figura su contraseña, no la suya. Si ya no se necesita, se puede eliminar sin afectar a nada más.

### ¿Cuándo tiene sentido?

- **Recordatorios de garantía**: una automatización de HA sobre el sensor `*_warranty_days` que avise en cuanto el valor baje a 30 o menos. El sensor binario `*_warranty_active` no cambia a `off` hasta el día del vencimiento y por eso no sirve para un aviso previo.
- **Tarjetas de dashboard**: «Todos los dispositivos en garantía», «Dispositivos cuya garantía vence pronto», ordenados por `*_warranty_days`.
- **Estadísticas del inventario** en el dashboard de HA, sin tener que abrir la Gestión de Dispositivos.

**No** tiene sentido si usa el complemento solo como herramienta de documentación: entonces solo crea tarjetas de HA que nadie mira.

### Limpiar cuando ya no se quiere

Una pregunta frecuente: *«¿Cómo borro todos los topics MQTT si desactivo el complemento?»*

Por defecto, los topics MQTT retenidos **permanecen** en el broker aunque desactive el interruptor. Es una particularidad de MQTT-Discovery (HA no borra mensajes retenidos escritos por otro productor). Tres formas de limpiar de forma ordenada:

1. **(Recomendado) Limpiar entradas huérfanas**: en el apartado *Integración Home Assistant* de los Ajustes existe desde la v2.6.0 el botón **«Limpiar entradas huérfanas»**. El botón elimina todos los topics retenidos de dispositivos del inventario que ya ha borrado en la Gestión de Dispositivos. Los dispositivos activos no se tocan. Seguro como acción rutinaria.

2. **Eliminar todas las entradas MQTT**: al lado está el botón **«Eliminar todas las entradas MQTT»** (rojo). Con confirmación. Elimina **todos** los mensajes Discovery publicados por el complemento, también los de dispositivos que siguen en el inventario. Es el último paso razonable antes de desactivar MQTT-Discovery de forma permanente.

3. **Manualmente con MQTT Explorer**: topic `geraeteverwaltung/#` y `homeassistant/+/geraeteverwaltung/+/config`; en cada topic, clic derecho → «Delete topic». Único método para instalaciones existentes sin la v2.6.0.

### Los dispositivos siguen en HA después de borrarlos en el complemento

Hasta la v2.5.2 había un error que omitía la limpieza MQTT al borrar dispositivos individuales: los topics Discovery quedaban, aunque el propio complemento debería haber enviado una señal de «borrar este dispositivo». Desde la v2.5.3 la limpieza de dispositivos individuales vuelve a funcionar de forma fiable. Para los restos existentes: un único clic en *Limpiar entradas huérfanas* los elimina.

---

## Dispositivos multicanal (Parent-Child)

Ejemplos: Shelly 2PM (dos canales de enchufe en una carcasa), hubs Tuya, hubs USB, Bosch SHC con termostatos conectados. Para estas configuraciones HA suele crear varios dispositivos (dispositivo principal + un subdispositivo por canal/sensor) y los vincula mediante `via_device_id`.

### Qué hace con ello la Gestión de Dispositivos

- En la importación de HA se evalúa `via_device_id` y se guarda como `parent_uuid` en el inventario.
- En la vista de detalle de un subdispositivo aparece arriba el recuadro **«Parte de: …»** con un salto al dispositivo principal.
- En la vista de detalle de un dispositivo principal aparece el recuadro **«Sub-dispositivos (N)»** con la lista de todos los hijos.
- Si en un subdispositivo pulsa **Volver**, regresa al dispositivo principal, no a la lista general.

### Ocultar subdispositivos

En configuraciones multicanal la lista crece rápido: tres filas para un único dispositivo físico. En la lista, a la izquierda de la ordenación, está el botón **«Solo principales»**; solo aparece si al menos un dispositivo está asignado como subdispositivo a un dispositivo principal. Activo: los subdispositivos quedan ocultos y la etiqueta del botón muestra el número de hijos ocultos. El filtro se mantiene durante la sesión.

**Los routers no son dispositivo principal (desde la 3.1.0):** FRITZ!Box y UPnP comunican en Home Assistant que *todos* los dispositivos de la red dependen de ellos. Antes la importación lo convertía en «Parte de FRITZ!Box»: timbre, robot cortacésped y móviles desaparecían entonces con el filtro *Solo principales*. La importación ya no adopta estas asignaciones a routers y deshace las existentes en la siguiente ejecución. Las centrales reales, como el coordinador Zigbee, el Bosch Smart Home Controller o el HomematicIP Access Point, siguen siendo dispositivo principal de sus dispositivos. Si un navegador ya abierto sigue mostrando la asignación antigua: *Ajustes → Limpiar caché local → Limpiar caché*.

**Los hubs de enrutamiento no se ocultan:** HA también asigna `via_device_id` a dispositivos conectados a través de un puente (puente Zigbee2MQTT → Hue/IKEA/Aqara, coordinador ZHA → dispositivos finales, stick Z-Wave-JS → dispositivos finales, servidor Matter → dispositivos finales). Estos «hijos» son hardware propio; solo el puente es software. Por eso el filtro trata los dispositivos con integración `mqtt`, `zha`, `zwave_js` o `matter` como dispositivos principales; de lo contrario, el filtro de principales ocultaría las lámparas reales y solo dejaría el puente.

### Aplicar la edición a todos los hijos

Al editar un dispositivo principal con subdispositivos aparece al final del formulario la casilla **«Aplicar también a N subdispositivos»**. Si está marcada, al guardar se replica *además* del dispositivo principal una actualización en lote con los siguientes campos en todos los hijos:

- Fabricante
- Fecha de compra
- Garantía hasta
- Alimentación
- AIN / Nº artículo

**No** se heredan los campos específicos de cada canal: nombre, número de serie, MAC, IP, ubicación, IDs de Home Assistant.

---

## Fusionar dispositivos duplicados

*Nuevo en 3.1.0.* Desde HA 2026.8, Home Assistant suele crear varias entradas para un mismo dispositivo físico: el Shelly mediante su propia integración y otra vez mediante la FRITZ!Box; con varias FRITZ!Box en malla, incluso una por cada caja. En el inventario el dispositivo aparecía entonces varias veces.

**Durante la importación**, la app une automáticamente en un solo dispositivo las entradas con la misma dirección MAC o Zigbee procedentes de distintas integraciones o configuraciones. Se conserva la entrada de la integración que controla el dispositivo (Shelly, Ring, Bosch …), no la del router. El gemelo queda registrado y no se vuelve a crear en la siguiente importación.

**Dispositivos ya importados por duplicado** (de versiones anteriores a la 3.1.0):

1. Despliegue *Ajustes → Posibles duplicados*, **Buscar duplicados**.
2. La lista muestra grupos con la misma dirección MAC. El primer dispositivo de cada grupo es la propuesta que se conserva.
3. El botón **→ en «Nombre del dispositivo destino»** de una fila fusiona ese dispositivo concreto; o bien **Aplicar todas las sugerencias** (dos clics para confirmar) para todos los grupos a la vez.

**A mano**, para dispositivos sin identificador común: en la página de detalle, **Fusionar con otro dispositivo …**, busque y seleccione el dispositivo destino, **Fusionar**.

Qué ocurre al fusionar:

- El dispositivo destino conserva todos sus datos. La app rellena los campos vacíos con los del otro dispositivo y añade las notas.
- Las fotos, fotos de instalación, documentos, historial de cambios y subdispositivos pasan al dispositivo destino.
- El otro dispositivo va a la papelera. Antes, la app crea una instantánea de la base de datos; en *Ajustes → Instantáneas de la base de datos* se puede recuperar todo.

---

## Seguro & herencia — los flujos de trabajo típicos

### Seguro

La plantilla *Seguro* de la exportación a PDF / Excel selecciona automáticamente los campos que suele pedir una aseguradora:

- Nº, Tipo, Nombre, Modelo, Fabricante
- Nº de serie, AIN / Nº de artículo
- Fecha de compra, Garantía hasta, Ubicación, Notas
- Enlace externo

La exportación a PDF y Excel con plantillas es Pro.

Flujo de trabajo:

1. En cada dispositivo de valor: tome una foto, suba el comprobante de compra como documento (ambas cosas Pro) y anote en Notas el precio de compra y, si procede, una nota para el seguro.
2. Una vez al año: *Ajustes → Exportar Datos → Exportar PDF / Excel... → Plantillas → Seguro*, después **PDF**. El PDF contiene los dispositivos como tabla compacta; quien quiera además una página de detalle por dispositivo elige en *Plantillas* **Todos los campos** o compone los campos a mano (allí las notas muy largas se acortan a 1000 caracteres, con una referencia a la exportación a Excel).
3. Además Excel, si la aseguradora procesa los datos: Excel recoge las notas completas en una celda.

### Herencia

La plantilla *Herencia* está pensada para los familiares: qué es, dónde está, si tiene garantía, dónde están los documentos, si funciona sin HA:

- Nº, Tipo, Nombre, Fabricante, Modelo, Nº de serie, AIN / Nº de artículo
- Fecha de compra, Garantía hasta
- Ubicación, Planta
- Funciona sin HA + nota
- Enlace externo
- Función, Notas

Los detalles de red (MAC, IP, firmware, integración) se excluyen a propósito desde la 3.0.0: no interesan a los herederos y solo ocupan ancho de columna.

---

### Traspaso a otra persona (desmontaje/electricista)

*Nuevo en 3.0.0.* El caso de fondo: algún día otra persona estará frente a la instalación: familiares, un electricista, un comprador. Esa persona no conoce Home Assistant ni la historia de la casa.

Para ello hay tres campos por dispositivo, al final del formulario de edición, en *Notas*. Se editan con Pro; los datos existentes siguen visibles también sin licencia.

**«¿Funciona sin Home Assistant?»** — tres opciones: *Desconocido* (valor por defecto, no se muestra nada), *Sí, funciona sin HA*, *No, necesita HA*. Con *Sí* o *No* aparece debajo un campo de nota para el texto en claro: «interruptor directo en la pared», «el termostato se ajusta en el aparato», «sin HA no se puede manejar».

**«¿Interruptor de pared puenteado?»** (*nuevo en 3.1.0*) — el punto más importante para el desmontaje: si para este dispositivo se puenteó un interruptor de luz, la lámpara deja de funcionar tras retirarlo. Tres opciones (*Desconocido*, *Sí, interruptor puenteado o desacoplado*, *No*) y un campo de nota: qué interruptor, qué caja, o qué ajuste, porque a menudo no hay nada conectado de otra forma, sino que el actuador está reconfigurado (p. ej. Shelly en modo «detached»). Aparece en la página de detalle bajo el título «Interruptor de pared». En el mismo recuadro figuran «Dependencia de Home Assistant» (el dato de «¿Funciona sin Home Assistant?») y «Enlace externo».

**«Enlace externo»** — una referencia a otro sistema: el documento en Paperless-ngx, la página del manual del fabricante, una entrada en su propio wiki. El enlace aparece en la página de detalle y se abre en una ventana nueva. Basta con un nombre como `paperless.local/x`; `https://` se añade automáticamente.

La plantilla de exportación **«Desmontaje/electricista»** (*Exportar PDF / Excel... → Plantillas*, Pro) genera la hoja que se deja en el cuarto de la acometida:

- Nº, Tipo, Nombre, Fabricante, Modelo
- Ubicación, Planta
- Red, Alimentación
- Funciona sin HA + nota
- Interruptor puenteado + nota
- Enlace externo
- Función, Notas

A propósito **sin** números de serie, datos de compra ni garantía: es la lista que puede quedar a la vista en el pasillo, mientras que las plantillas Seguro y Herencia contienen los datos completos.

La columna *Integración* se excluye desde la 3.0.0: `fritz` o `bosch_shc` son datos internos de Home Assistant y no le dicen nada a un técnico.

La plantilla **«Carpeta de emergencia»** (*nuevo en 3.1.0*) es la carpeta para el cuadro eléctrico: para el electricista, el vecino o el agente que los familiares llaman en una emergencia. Contiene dispositivo, planta y ubicación, fabricante, modelo, número de serie, alimentación, funciona-sin-HA, interruptores puenteados, fecha de compra, garantía, enlace al manual, función y notas. Sin detalles de red. Las contraseñas no deben figurar: la app no guarda ninguna por principio; basta con una nota en el campo Notas indicando dónde están las credenciales (gestor de contraseñas, carpeta).

**Todas las plantillas comparadas:**

| Plantilla | Para quién | Contiene |
|---|---|---|
| Seguro | Tramitador en caso de siniestro | Dispositivo, número de serie, fecha de compra, garantía, ubicación, enlace a la factura |
| Desmontaje/electricista | Técnico in situ | Dispositivo, ubicación, red, alimentación, funciona-sin-HA, interruptores puenteados, enlace; sin datos de compra |
| Herencia | Familiares | Dispositivo, número de serie, fecha de compra, garantía, ubicación, funciona-sin-HA, enlace |
| Carpeta de emergencia | Ayudante al que llaman los familiares | Dispositivo, ubicación, número de serie, alimentación, funciona-sin-HA, interruptores puenteados, fecha de compra, garantía, enlace |

En PDF, estas cuatro plantillas generan una tabla compacta en formato apaisado, unas diez páginas para 300 dispositivos. Las páginas de detalle por dispositivo aparecen con **Todos los campos** (también en *Plantillas*) o si compone los campos a mano. Desde la 3.1.0 la app guarda su selección de campos en el servidor, por lo que también vale en el móvil o tras borrar los datos del navegador.

**Orden** (*nuevo en 3.1.0*): en el diálogo de exportación se puede elegir entre *Agrupado por categoría* (comportamiento anterior) y **Planta › Ubicación › Nombre**. Para la hoja del cuadro eléctrico, la segunda opción es la correcta: quien está delante busca por habitación, no por nombre de dispositivo. En Excel sale como tabla continua sin filas intermedias de categoría, que se puede ordenar y filtrar libremente.

**Imágenes en el PDF** (*nuevo en 3.1.0*): en *Imágenes en el PDF* se pueden añadir **Fotos de instalación** y **Fotos del dispositivo y documentos de imagen**. Las imágenes aparecen como anexo al final del PDF; en la lista, la columna *Imágenes* muestra para cada dispositivo la referencia (B1, B2 …). Una imagen asociada a varios dispositivos aparece una sola vez, con todos los dispositivos correspondientes. Excel no contiene imágenes.

## Importar Excel

*Nuevo en 3.1.0, Pro.* En *Ajustes → Exportar Datos*, debajo de los botones de exportación, **Importar Excel** vuelve a leer un archivo Excel de *Exportar PDF / Excel...*.

- La app reconoce las columnas por su encabezado, no por su posición. Funciona cualquier selección de campos, tanto agrupada por categoría como en tabla continua. La columna *Planta* no se importa.
- Las fotos, fotos de instalación y documentos no forman parte del archivo.
- Sin más selección, los dispositivos se añaden **además** del inventario existente. Quien vuelva a leer así su propia exportación tendrá después cada dispositivo por duplicado.
- Con la casilla **«Reemplazar los dispositivos existentes (todos a la papelera, con instantánea previa)»**, todos los dispositivos anteriores van a la papelera antes de leer el archivo. Tras elegir el archivo hay que confirmarlo con **«¿Reemplazar realmente todos los dispositivos?»**.

---

## Filtro, búsqueda y orden

- **Búsqueda** arriba: busca en nombre, modelo, fabricante, ubicación, MAC, IP, número de serie, integración, función y tipo.
- **Chips de categoría** debajo de la búsqueda: las categorías integradas solo aparecen si contienen al menos 1 dispositivo; las categorías propias (de *Gestionar categorías*) aparecen siempre desde la 3.1.0, igual que los tipos escritos a mano. Un clic alterna entre *activo* y *desactivado*. Un filtro activo sigue visible aunque desaparezca el último dispositivo de esa categoría, para poder quitarlo.
- **Vista previa de foto**: si un dispositivo tiene foto, la lista la muestra como miniatura (desde la 3.1.0).
- Los **gráficos de anillo** y las **listas Top 10** del panel se pueden pulsar: un clic en la barra de un fabricante aplica un filtro por fabricante y salta a la lista de dispositivos.
- Los **chips de filtro** sobre la lista (p. ej. «Por Fabricante (Top 10): BOSCH ×») muestran el filtro activo; la X lo quita.
- **Orden**: desplegable a la derecha. Opciones: Editados recientemente (por defecto), Nombre A→Z/Z→A, Tipo, Fabricante, Ubicación, Garantía pronto a vencer (vencimiento más próximo primero). La selección se mantiene durante la sesión.
- **Interruptor «Solo principales»**: oculta los hijos (consulte el capítulo Multicanal).
- **Edición en lote** (Pro): con **Seleccionar** sobre la lista, marque varios dispositivos y cambie juntos el tipo o la integración, o bórrelos. Sin Pro, el botón aparece atenuado y lleva el añadido «(Pro)».

---

## Papelera & instantáneas de la base de datos

### Papelera

- Los dispositivos borrados van primero a la papelera y se pueden restaurar durante 30 días en *Ajustes → Papelera*.
- Pasados 30 días, la app los elimina permanentemente de forma automática. Lo comprueba al iniciarse el complemento y después una vez al día. Antes crea una instantánea («Antes del vaciado automático de la papelera (30 días)»), con la que también esto se puede recuperar.
- Dos modos de restauración: por entrada (botón en cada fila) o en lote («Restaurar N» arriba a la derecha tras seleccionar).
- *Eliminar permanentemente* borra el dispositivo junto con sus fotos, fotos de instalación y documentos, incluidos los archivos correspondientes.
- **Vaciar papelera** (arriba en la papelera) elimina permanentemente todas las entradas de una vez. El primer clic pregunta «¿Borrar definitivamente los {N}?»; solo el segundo borra. Antes la app crea una instantánea («Antes de vaciar la papelera»); lo mismo ocurre si elimina permanentemente varias entradas seleccionadas.
- El botón *Mover todo a la papelera* (Ajustes, al final) está pensado como último recurso de reinicio: mueve todo el inventario a la papelera con instantánea.

### Instantáneas de la base de datos

- Antes de cada acción masiva la app crea automáticamente una instantánea de la base de datos: borrar varios o todos los dispositivos, recategorizar, edición en lote, fusionar, «Aplicar todas las sugerencias», borrar una categoría, importación de Excel con reemplazo, limpiar autoimportaciones, vaciar la papelera o eliminar permanentemente varias entradas, vaciado automático de la papelera y antes de cada restauración.
- A mano: *Ajustes → Instantáneas de la base de datos* → **Crear instantánea ahora**, p. ej. antes de sus propias tareas de limpieza. Aparece en la lista como «Creada a mano».
- Lista en *Ajustes → Instantáneas de la base de datos*. Por entrada: motivo en texto claro (p. ej. «Antes de fusionar», «Antes de borrar la categoría «…»»), antigüedad y tamaño.
- *Restaurar* sobrescribe la base de datos actual con la instantánea: un «deshacer para la última acción».

---

## Preguntas frecuentes (FAQ)

### «Mi complemento muestra 1500 dispositivos, pero solo tengo 200.»

Antes de la v2.5.2, la importación de HA se ejecutaba varias veces mientras MQTT-Discovery estaba activo. La importación recogía entonces los dispositivos publicados por el propio complemento: el número de dispositivos del inventario se duplicaba con cada importación. Solución:

1. Actualice como mínimo a la v2.5.2.
2. Despliegue *Ajustes → Posibles duplicados*, apartado «Dispositivos MQTT propios de una importación antigua», **Limpiar autoimportaciones**. El botón mueve esas entradas a la papelera; antes la app crea una instantánea. Los demás dispositivos no se tocan.
3. Pasados 30 días, la app los elimina permanentemente de forma automática. Si tiene prisa: *Ajustes → Papelera* → **Vaciar papelera**.

### «Hago clic en ‹Subir documento› y acabo en la página de detalle sin que se haya subido nada.»

Error hasta la v2.5.3. Corregido desde la v2.6.0 (`type="button"` en los botones; si no, envían el formulario que los contiene). Actualice.

### «Al hacer clic en ‹Ver en HA› se abre el navegador y tengo que volver a iniciar sesión en HA.»

Afectaba a la app HA Companion en el móvil hasta la v2.5.3. Desde la v2.6.3 el complemento reconoce la Companion y abre el dispositivo mediante el enlace profundo `homeassistant://navigate/…` directamente en la app Companion, sin volver a iniciar sesión.

### «La exportación a PDF rompe el diseño en un dispositivo con notas largas.»

Error hasta la v2.5.3 (fpdf2 + cabecera personalizada + salto de página de multi_cell). Desde la v2.6.0 las notas de la sección de detalle se cortan a 1000 caracteres con la indicación «... (N chars total — full text in Excel export)». Excel recoge el texto completo en una celda sin problemas de diseño.

### «¿Dónde se guarda la clave de licencia? ¿Qué ocurre al actualizar el complemento?»

La licencia se guarda en la carpeta de datos del complemento como `license.json` (gestionada por HA). Las actualizaciones del complemento la conservan. Reinstalar = hay que volver a introducirla.

### «¿Qué idiomas?»

DE, EN, ES, FR, RU. Se cambia en *Ajustes → Idioma*. La versión Free está limitada a EN y arranca directamente en inglés; Pro desbloquea todos los idiomas.

---

## Solución de problemas

### El navegador bloquea la exportación («Descarga no segura bloqueada»)

Ocurre cuando accede a Home Assistant mediante una dirección sin cifrar, es decir `http://<IP>:8123`. Los navegadores ya no permiten descargar archivos desde estas páginas sin preguntar. No tiene nada que ver con la app: la exportación se genera y se entrega correctamente.

**Así obtiene el archivo:** en el área de descargas del navegador, haga clic en **Conservar**. El archivo está completo y sin cambios.

**Así desaparece la pregunta de forma permanente:** acceda a Home Assistant mediante una conexión cifrada: con Home Assistant Cloud (Nabu Casa), con un certificado propio mediante Duck DNS y Let's Encrypt, o con un proxy inverso delante. Después el problema ya no aparece.

### ¿Dónde están mis datos y cómo hago una copia de seguridad?

Todo lo que guarda la app está en el directorio de datos del complemento:

| Qué | Dónde |
|---|---|
| Base de datos con todos los dispositivos | `/data/db/geraeteverwaltung.db` |
| Fotos y fotos de instalación | `/data/photos/` |
| Documentos | `/data/documents/` |
| Instantáneas de la base de datos | `/data/db/snapshots/` |
| Interruptor MQTT | `/data/db/mqtt_settings.json` |
| Clave de licencia | `/data/db/license.json` |

**Copia de seguridad:** no tiene que hacer nada a mano. Una copia de seguridad de Home Assistant incluye completo el directorio de datos del complemento. Si además quiere tener la lista de dispositivos fuera de HA, use *Ajustes → Exportar Datos → Exportar JSON*. Antes de intervenciones propias ayuda *Ajustes → Instantáneas de la base de datos → Crear instantánea ahora*; no obstante, la instantánea también se guarda en el directorio de datos del complemento.

**No** escriba en la base de datos mientras el complemento está en marcha. Quien la abre y edita mediante Samba o SSH se arriesga a dañar el archivo: la app lo mantiene abierto. Para consultarla, detenga antes el complemento.

### Falla la conexión MQTT

En *Ajustes → Integración Home Assistant* está **«Probar conexión MQTT»**. El botón devuelve un mensaje de error concreto, con una indicación según el código de error:

- **Código 4 / 5 / 135 (inicio de sesión rechazado, «Not authorized»)**: faltan las credenciales o no son correctas. Paso a paso en [Credenciales para el broker MQTT](#credenciales-para-el-broker-mqtt).
- **Conexión rechazada**: ¿está en marcha el broker Mosquitto? ¿Es correcto el puerto (1883 sin cifrar, 8883 TLS)?
- **No accesible / tiempo de espera agotado**: ¿son correctos el nombre de host/la IP? Con un broker externo: la red de HA debe poder alcanzar el broker.
- **Error de DNS**: revise el campo `mqtt_host` en las opciones del complemento.

### La importación de HA devuelve 502 Bad Gateway

Error hasta la v2.5.2: la importación duraba más que el tiempo de espera HTTP de HA-Ingress. Desde la v2.5.3 la importación se ejecuta en segundo plano con consulta de progreso; ya no hay tiempo de espera.

### Informe de diagnóstico para un issue de GitHub

*Ajustes → Soporte y diagnóstico* genera un informe con la versión del complemento, la arquitectura, la versión de Python, el estado MQTT (sin credenciales), el número de dispositivos y las últimas 200 líneas del registro. Las contraseñas, tokens y direcciones de correo se eliminan automáticamente; en las direcciones IP se enmascaran los dos últimos octetos. Se envía con un clic o se copia al portapapeles.

---

## Protección de datos y aspectos legales

**Dónde están los datos:** todos los datos de dispositivos, fotos, fotos de instalación y documentos permanecen en su instalación de Home Assistant (directorio de datos del complemento). Para el modo sin conexión, el navegador de cada dispositivo con el que abra la app guarda además los datos de dispositivos y la foto del dispositivo. Las fotos de instalación y los documentos solo están en el servidor, no en el navegador. La app no contiene seguimiento ni herramientas de análisis.

**Qué envía el complemento al exterior:** solo la clave de licencia junto con el identificador de instalación al proveedor de pagos Lemon Squeezy, al activarla y para la comprobación ocasional. Los datos de dispositivos solo salen de su instalación si usted mismo exporta, envía un informe de diagnóstico o publica dispositivos por MQTT en su propio broker.

**Garantía:** el software se proporciona sin garantía; rigen las condiciones de licencia del repositorio de GitHub.

---

## Soporte y contacto

- **Informar de errores o solicitar funciones:** [github.com/DerRegner-DE/ha-device-inventory](https://github.com/DerRegner-DE/ha-device-inventory) → *Issues*. Lo más rápido es adjuntar el informe de diagnóstico de *Ajustes → Soporte y diagnóstico*.
- **Sin cuenta de GitHub:** correo electrónico a support@derregner.info.
- **Intercambio con otros usuarios:** foro de la comunidad simon42, hilo «Geräteverwaltung».

---

Versión v3.1.0 · 2026-10-05. Las preguntas que no se respondan aquí pueden enviarse como issue en GitHub o por correo electrónico a support@derregner.info; el manual se actualiza con cada versión.
