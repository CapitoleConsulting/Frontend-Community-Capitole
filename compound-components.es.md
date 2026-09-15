# Construyendo componentes flexibles en React con el patrón Compound Components

Crear un componente reutilizable en React parece bastante sencillo al principio. Recibe unas props, muestra información y responde a alguna interacción. Lo usamos en dos pantallas y funciona perfectamente.

Después aparece una tercera pantalla que necesita mover el botón. Otra necesita una cabecera diferente. En la siguiente, el contenido tiene que empezar desplegado y mostrar una acción adicional. Vamos añadiendo propiedades porque cada petición, por separado, tiene sentido.

El problema llega cuando abrimos la definición del componente y necesitamos leer veinte props para entender qué puede hacer. Y unas cuantas condiciones para averiguar qué combinaciones funcionan.

Los Compound Components son una forma de abordar esa situación. La idea es dividir una interfaz en piezas que podamos combinar, manteniendo coordinado el comportamiento que comparten.

Vamos a verlo con un panel desplegable. Es un ejemplo pequeño, pero nos permite hablar de composición, estado, diseño de APIs y TypeScript sin tener que construir una biblioteca entera.

## El problema de los componentes sobreconfigurados

Imaginemos que empezamos con algo así:

```tsx
<Panel
  title="Información del envío"
  description="Consulta los plazos y condiciones."
/>
```

Hasta aquí, poco que discutir. La API es clara y probablemente suficiente.

Pero el componente empieza a utilizarse en más sitios y termina creciendo:

```tsx
<Panel
  title="Información del envío"
  description="Consulta los plazos y condiciones."
  showIcon
  iconPosition="left"
  showBadge
  badgeText="Gratis"
  collapsible
  defaultOpen
  showFooter
  footerText="Aplicable a pedidos superiores a 50 €"
  showAction
  actionLabel="Consultar condiciones"
  onAction={handleConditions}
  actionPosition="footer"
/>
```

No todas esas propiedades son malas. `defaultOpen`, por ejemplo, expresa una decisión de comportamiento bastante concreta.

Lo que empieza a resultar incómodo es configurar la estructura de la interfaz mediante banderas. Para mostrar un botón necesitamos indicar que existe, qué texto tiene, dónde aparece y qué ocurre al pulsarlo. Si mañana queremos dos botones, habrá que ampliar el contrato.

Dentro del componente suele pasar algo parecido:

```tsx
{showFooter && (
  <footer>
    {footerText && <p>{footerText}</p>}

    {showAction && actionPosition === "footer" && (
      <button onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </footer>
)}
```

Cada nueva variante añade caminos. También aparecen combinaciones difíciles de interpretar: ¿qué ocurre si `showFooter` es `false`, pero la posición de la acción es `"footer"`?

El componente acaba decidiendo demasiadas cosas sobre cómo se presenta cada caso de uso.

Además, sobreconfiguración y prop drilling no son exactamente el mismo problema. Podemos tener veinte props que el componente utiliza directamente, sin pasarlas por ninguna capa intermedia. O tener una API pequeña con información atravesando cinco componentes que no la necesitan.

Conviene distinguirlos porque la solución no siempre será la misma.

## ¿Qué son los Compound Components?

Los Compound Components son un conjunto de componentes diseñados para trabajar juntos. Cada pieza tiene una responsabilidad reconocible y el consumidor decide cómo combinarlas dentro de un contrato.

La API de nuestro panel podría ser esta:

```tsx
<Panel defaultOpen>
  <Panel.Trigger>
    Información del envío
  </Panel.Trigger>

  <Panel.Content>
    <p>Consulta los plazos y condiciones.</p>
  </Panel.Content>
</Panel>
```

`Panel` coordina el comportamiento. `Panel.Trigger` permite abrir y cerrar. `Panel.Content` muestra el contenido correspondiente.

La relación entre ellos tiene sentido como conjunto. Un botón que cambia el estado y un contenido que responde a ese cambio.

La notación con punto ayuda a reconocer esa relación, pero no es un requisito técnico del patrón. También podríamos exportar `PanelRoot`, `PanelTrigger` y `PanelContent` por separado.

Y poner funciones como propiedades de otra función no hace que compartan estado automáticamente. `Panel.Trigger` es una forma de organizar la API en JavaScript. La coordinación hay que implementarla.

En este artículo utilizaremos Context para hacerlo. Los Compound Components describen cómo se compone la interfaz; Context será el mecanismo que usaremos para comunicar sus piezas.

## De un componente monolítico a una API compuesta

Volvamos al panel con muchas opciones. Podemos expresar su contenido directamente:

```tsx
<Panel defaultOpen>
  <div className="panel-heading">
    <Panel.Trigger>
      Información del envío
    </Panel.Trigger>

    <span className="badge">Gratis</span>
  </div>

  <Panel.Content>
    <p>Consulta los plazos y condiciones.</p>

    <footer>
      <p>Aplicable a pedidos superiores a 50 €.</p>
      <a href="/condiciones-de-envio">
        Consultar condiciones
      </a>
    </footer>
  </Panel.Content>
</Panel>
```

Ahora podemos ver qué aparece y dónde aparece. Para añadir otra acción escribimos otra acción. Para quitar el pie, quitamos el elemento.

El padre sigue recibiendo `defaultOpen` porque el estado inicial pertenece al comportamiento del panel. Los textos y la distribución quedan en el lugar donde se utiliza.

Hay un detalle que me parece importante: no hemos creado `Panel.Badge`, `Panel.Description`, `Panel.Footer` y `Panel.Link` por obligación. Podemos utilizar HTML normal.

Si un pie compartido necesita estilos y comportamiento propios, tendrá sentido extraerlo. Pero dividir cada etiqueta en un componente con nombre no nos garantiza una API mejor.

La API compuesta tiene algo más de JSX que la versión inicial con dos props. A cambio, evita que cada variación de contenido requiera modificar el componente base. Esa es la compensación que estamos buscando.

## Compartiendo estado entre Compound Components

Necesitamos que el disparador y el contenido sepan si el panel está abierto. El disparador también debe poder solicitar un cambio.

Empezamos definiendo el contexto y un pequeño hook para consumirlo:

```tsx
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";

type PanelContextValue = {
  open: boolean;
  contentId: string;
  setOpen: (open: boolean) => void;
};

const PanelContext =
  createContext<PanelContextValue | null>(null);

function usePanelContext() {
  const context = useContext(PanelContext);

  if (context === null) {
    throw new Error(
      "Los componentes de Panel deben usarse dentro de <Panel>."
    );
  }

  return context;
}
```

Prefiero fallar con un mensaje claro cuando falta el padre. Un contexto por defecto con una función vacía podría hacer que el botón pareciese correcto, pero no respondiese. Ese fallo es bastante más desagradable de depurar.

Ahora implementamos una primera versión del componente raíz, que gestiona su propio estado:

```tsx
type PanelRootProps = {
  children: ReactNode;
  defaultOpen?: boolean;
};

function PanelRoot({
  children,
  defaultOpen = false,
}: PanelRootProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <PanelContext.Provider
      value={{ open, setOpen, contentId }}
    >
      <div className="panel">{children}</div>
    </PanelContext.Provider>
  );
}
```

Las piezas consumen ese contexto:

```tsx
function PanelTrigger({
  children,
}: {
  children: ReactNode;
}) {
  const { open, setOpen, contentId } = usePanelContext();

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

function PanelContent({
  children,
}: {
  children: ReactNode;
}) {
  const { open, contentId } = usePanelContext();

  return (
    <div id={contentId} hidden={!open}>
      {children}
    </div>
  );
}

export const Panel = Object.assign(PanelRoot, {
  Trigger: PanelTrigger,
  Content: PanelContent,
});
```

Estos fragmentos forman una implementación básica en un mismo archivo. `Object.assign` añade las piezas a la función raíz y TypeScript conserva sus tipos.

El botón usa un elemento nativo, por lo que dispone de activación mediante teclado. `aria-expanded` comunica su estado y `aria-controls` lo relaciona con el contenido.

En esta versión, cada raíz está pensada para un disparador y un contenido. `hidden` mantiene el contenido montado mientras lo oculta. Si dentro hay un formulario, sus valores locales se conservan al cerrar, y sus efectos continúan activos. Desmontarlo sería otra decisión de comportamiento.

El envoltorio `panel-heading` del ejemplo anterior no necesita recibir `open` ni reenviarlo. El contexto conecta las piezas aunque haya elementos intermedios. Esa es la parte que nos ayuda con el prop drilling.

También hay un coste: los consumidores de un contexto se actualizan cuando cambia su valor. Este patrón no ofrece una mejora automática de rendimiento. Para un panel pequeño, la implementación es suficiente; si apareciese un problema medido, revisaríamos la estabilidad del valor y qué consume cada pieza.

## Diseñando una API de componentes limpia

La implementación interna importa, pero quien utilice el componente se encontrará primero con su API.

Yo empezaría escribiendo dos o tres usos reales antes de desarrollar todas las piezas. Uno sencillo, otro con contenido adicional y uno con una distribución diferente. Si la API resulta incómoda en esos ejemplos, probablemente también lo será cuando llegue a producción.

En nuestro caso, los nombres tienen que explicar el papel de cada parte. `Trigger` comunica una interacción. `Content` señala el contenido que depende de ella. Un nombre como `Panel.Manager` obligaría a leer la implementación para entender qué pinta ahí.

También conviene delimitar la flexibilidad. El consumidor puede colocar un texto auxiliar junto al disparador, pero no debería introducir un enlace dentro del botón. La composición no hace válidas todas las estructuras HTML.

Otra decisión es qué propiedades nativas exponemos. Poder pasar `className`, `disabled` o atributos accesibles suele ser útil. En cambio, permitir sobrescribir sin más `aria-expanded` podría romper la relación entre lo que anuncia el botón y el estado real.

Con los eventos ocurre algo parecido. Si exponemos `onClick`, debemos decidir cómo se combina con la apertura del panel. ¿Se ejecutan ambos? ¿Puede el consumidor cancelar el comportamiento con `preventDefault()`?

No hay que implementar todos esos puntos desde el primer día. Sí hay que evitar que el comportamiento dependa accidentalmente del orden de un spread.

Y documentaría las restricciones junto a los ejemplos: un contenido por raíz, disparador dentro del proveedor y contenido del botón sin controles interactivos anidados. La flexibilidad funciona mejor cuando sabemos hasta dónde llega.

## Compound Components controlados y no controlados

Nuestra primera versión es no controlada. El panel guarda su estado y `defaultOpen` establece el valor inicial:

```tsx
<Panel defaultOpen>
  <Panel.Trigger>Detalles</Panel.Trigger>
  <Panel.Content>
    <p>Información adicional del pedido.</p>
  </Panel.Content>
</Panel>
```

Cambiar `defaultOpen` después del montaje no debe utilizarse como una orden para abrirlo. Para controlar el estado desde fuera necesitamos otra API.

Por ejemplo, una pantalla puede querer abrir el panel después de una acción o coordinarlo con otros elementos:

```tsx
const [detailsOpen, setDetailsOpen] = useState(false);

<Panel
  open={detailsOpen}
  onOpenChange={setDetailsOpen}
>
  <Panel.Trigger>Detalles</Panel.Trigger>
  <Panel.Content>
    <p>Información adicional del pedido.</p>
  </Panel.Content>
</Panel>
```

En este modo, el padre decide el valor. El panel solicita cambios mediante `onOpenChange`.

Podemos reemplazar los tipos y la implementación de `PanelRoot` por estos:

```tsx
type PanelRootProps = {
  children: ReactNode;
} & (
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      defaultOpen?: never;
    }
  | {
      open?: never;
      defaultOpen?: boolean;
      onOpenChange?: (open: boolean) => void;
    }
);

function PanelRoot(props: PanelRootProps) {
  const [internalOpen, setInternalOpen] = useState(
    props.defaultOpen ?? false
  );
  const contentId = useId();

  const isControlled = props.open !== undefined;
  const open = props.open ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    props.onOpenChange?.(nextOpen);
  }

  return (
    <PanelContext.Provider
      value={{ open, setOpen, contentId }}
    >
      <div className="panel">{props.children}</div>
    </PanelContext.Provider>
  );
}
```

Los subcomponentes siguen funcionando igual. No necesitan conocer quién guarda el estado.

Si el panel está controlado y el padre no actualiza `open`, la interfaz mantiene su valor. Es el contrato esperado: llamar al callback no equivale a aceptar el cambio.

Mantendría además el mismo modo durante toda la vida de una instancia. Pasar de no controlado a controlado a mitad de uso, o al revés, introduce dudas sobre qué estado debe prevalecer.

Lo que evitaría es copiar continuamente `open` a un estado interno mediante un efecto. En el modo controlado ya tenemos un propietario del valor.

## Compound Components seguros con TypeScript

TypeScript puede ayudarnos bastante a expresar el contrato, aunque no va a revisar por nosotros toda la composición.

La unión anterior permite distinguir las dos formas de uso. Si proporcionamos `open`, también tenemos que proporcionar `onOpenChange`. Y no podemos mezclar `open` con `defaultOpen`.

Eso evita combinaciones ambiguas antes de ejecutar la aplicación.

También podemos aprovechar los tipos de los elementos nativos para ampliar el disparador. Por ejemplo, una versión que acepte propiedades de botón, pero reserve para el componente los atributos de coordinación:

```tsx
import type { ComponentPropsWithoutRef } from "react";

type PanelTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  | "type"
  | "aria-expanded"
  | "aria-controls"
  | "dangerouslySetInnerHTML"
> & {
  children: ReactNode;
};

function PanelTrigger({
  children,
  onClick,
  ...props
}: PanelTriggerProps) {
  const { open, setOpen, contentId } = usePanelContext();

  return (
    <button
      {...props}
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          setOpen(!open);
        }
      }}
    >
      {children}
    </button>
  );
}
```

Ahora podemos pasar `disabled`, `className` y otros atributos habituales. El callback del consumidor se ejecuta primero y puede cancelar la apertura con `preventDefault()`. Es una decisión explícita de esta API.

Hemos usado `ComponentPropsWithoutRef`, así que esta versión no ofrece reenvío de referencias. Si lo necesitamos, habrá que diseñarlo e implementarlo también.

Quedan cosas que los tipos no garantizan. Aceptar `children: ReactNode` no asegura que exista exactamente un `Panel.Content`, ni que `Panel.Trigger` tenga un proveedor encima. Tampoco impide por sí solo que alguien coloque otro botón dentro.

Por eso seguimos necesitando la comprobación del contexto y pruebas de comportamiento. Comprobaría la apertura mediante teclado, los atributos del botón, el modo controlado y la independencia entre dos paneles. Que el JSX compile es una parte de la validación.

## Cuándo funcionan bien los Compound Components

Me parecen especialmente útiles cuando el comportamiento se mantiene, pero la composición cambia entre pantallas.

Un panel desplegable puede mostrar texto, formularios o acciones. Un grupo de pestañas coordina la selección y sus paneles. Un menú relaciona un disparador con varias opciones. Hay un comportamiento común que merece quedar encapsulado y una estructura que necesita cierto margen.

También encajan bien en bibliotecas de componentes utilizadas por varios equipos. Quien implementa la base puede ocuparse de las relaciones y las interacciones, mientras los consumidores adaptan el contenido.

Eso sí, un menú o un sistema de pestañas requiere bastante más trabajo que nuestro panel: navegación por teclado, gestión del foco y semántica específica. El patrón organiza esas responsabilidades, pero no las implementa por nosotros.

Un buen indicador para planteárselo es que cada nueva pantalla obligue a añadir otra prop de posición, otro renderizador o una excepción de contenido al mismo componente.

Antes de añadir la siguiente bandera, merece la pena mirar si lo que falta es una pieza que el consumidor pueda colocar directamente.

## Cuándo no deberías usarlos

No convertiría un componente sencillo en una API compuesta sólo porque el patrón resulte atractivo.

Para un aviso que siempre tiene el mismo formato, esto puede ser suficiente:

```tsx
<Notice
  variant="warning"
  message="Tu sesión está a punto de caducar."
/>
```

Obligar a escribir `Notice.Root`, `Notice.Icon`, `Notice.Body` y `Notice.Message` en cada uso añade decisiones que quizá no necesitamos.

También revisaría primero las posibilidades del navegador. Si el caso es simplemente mostrar y ocultar información, `details` y `summary` pueden resolverlo con mucho menos código. Nuestro ejemplo permite estudiar el patrón, pero una implementación propia debe justificar el trabajo que añade.

Otro caso donde tendría cuidado es una interfaz generada a partir de datos. Si el servidor entrega una lista de campos o acciones, una configuración puede resultar más cómoda que construir manualmente una API compuesta.

Y no usaría el contexto de un componente como sustituto de la arquitectura de la aplicación. Que unas piezas compartan apertura, selección o foco tiene sentido. Meter ahí autenticación, permisos, peticiones y datos de varias páginas empieza a mezclar otro tipo de responsabilidades.

## Compound Components vs. props de configuración

Yo no lo plantearía como una elección definitiva entre las dos opciones. Una API puede utilizar ambas.

Las props funcionan bien para datos y opciones acotadas: `size`, `disabled`, `open` o una variante visual. La composición resulta cómoda cuando queremos decidir qué contenido existe y cómo se organiza.

Por ejemplo:

```tsx
<Panel defaultOpen>
  <Panel.Trigger disabled={isLoading}>
    Información del pedido
  </Panel.Trigger>

  <Panel.Content>
    <OrderSummary order={order} />
  </Panel.Content>
</Panel>
```

Seguimos usando props. Lo que hemos dejado de configurar mediante banderas es la estructura completa.

Además, podemos construir una versión más cerrada sobre la API compuesta:

```tsx
function HelpPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Panel>
      <Panel.Trigger>{title}</Panel.Trigger>
      <Panel.Content>{children}</Panel.Content>
    </Panel>
  );
}
```

Si casi todas las pantallas necesitan esta distribución, `HelpPanel` evita repetirla. Los casos que requieren más libertad pueden utilizar las piezas originales.

Esta combinación me parece bastante práctica. Podemos mantener una base flexible y ofrecer una entrada sencilla para los usos habituales, sin obligar a todo el equipo a montar cada detalle.

## Conclusiones

Los Compound Components nos permiten compartir comportamiento y dejar parte de la estructura en manos de quien utiliza el componente. Son una herramienta útil cuando una API empieza a acumular opciones para resolver distribuciones cada vez más distintas.

Pero el resultado depende del contrato que diseñemos. Hay que decidir qué controla el padre, qué responsabilidad tiene cada pieza, cómo se comparte el estado y qué combinaciones soportamos.

En el ejemplo, el panel coordina la apertura y las relaciones entre disparador y contenido. El consumidor decide qué mostrar dentro. Context permite conectar esas piezas y TypeScript ayuda a expresar las formas válidas de utilización.

Personalmente, empezaría con un componente normal y prestaría atención a cómo cambia. Si las nuevas necesidades son valores y variantes bien delimitadas, seguiría con props. Si empiezan a ser cambios continuos de estructura, probaría una API compuesta con esos casos reales delante.

El objetivo es que el siguiente uso resulte fácil de expresar y que el equipo pueda entenderlo al leer el JSX. Si para conseguirlo hemos creado una API que necesita más explicación que el componente original, todavía queda algo por simplificar.

## Referencias
- React: [useContext](https://react.dev/reference/react/useContext). Funcionamiento de proveedores, consumidores y actualizaciones del contexto.
- React: [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components). Propiedad del estado y componentes controlados y no controlados.
- W3C WAI: [Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/). Interacción y atributos accesibles para mostrar y ocultar contenido.
