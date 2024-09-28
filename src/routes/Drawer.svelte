<script lang="ts">
  import { useDrawer } from '$lib/index.js'

  const {
    portalled,
    overlay,
    content,

    inTransition,
    outTransition,
    meltDialog,

    onDragHandlePointerDown,
    openDrawer,
  } = useDrawer({ onClosed: () => console.log('Closed') })

  const {
    elements: { trigger, title, description, close },
    states: { open },
  } = meltDialog
</script>

<button {...$trigger} onclick={openDrawer}> Open Dialog Test </button>

{#if $open}
  <div {...$portalled} use:portalled in:inTransition out:outTransition>
    <div {...$overlay} use:overlay class="fixed z-[1000] inset-0 bg-black/60"></div>

    <div
      {...$content}
      use:content
      class="z-[1000] bg-zinc-100 flex fixed rounded-t-[10px] flex-col h-[96%] bottom-0 left-0 right-0"
    >
      <div
        data-vaul-drag-handle
        class="handle-overlay flex items-center justify-center"
        onpointerdown={onDragHandlePointerDown}
      >
        <div class="handle bg-[red] absolute w-[30px] h-[20px]"></div>
      </div>

      <section class="py-2 px-6 overflow-auto flex flex-col">
        <h2 {...$title} use:title>Dialog Title</h2>
        <p {...$description} use:description>Dialog description</p>

        <input type="text" class="border text-base" />

        <button {...$close} use:close> Close Dialog </button>

        Lorem ipsum dolor sit amet consectetur adipisicing elit. Nostrum explicabo provident,
        nesciunt et perspiciatis voluptas cum, enim ratione amet omnis, voluptates maxime voluptatem
        eos illo deserunt ex cupiditate facere similique asperiores suscipit. Omnis id ab velit
        sequi voluptatibus accusamus illo iusto vero quae voluptatum magni, magnam, aut ipsam
        aliquam reiciendis minima fuga perferendis! Veritatis, itaque cupiditate accusantium cum
        voluptas, explicabo doloremque a esse, blanditiis debitis quidem voluptates libero beatae ex
        vitae natus aliquam. Itaque autem corrupti vero. Accusamus error dolorem odit eum incidunt
        nisi minus totam et repellendus sed, consequuntur, iusto vitae, voluptatibus impedit
        voluptatum consequatur. Quasi laudantium quas modi. Ipsum iste doloremque voluptatibus
        dignissimos quod incidunt cupiditate culpa neque qui? Id amet quisquam dolores sunt
        provident voluptatibus expedita error accusamus! Ab iusto, expedita ex magnam alias dolorem
        similique non officia, fugit laborum assumenda, excepturi unde dolores error veniam aperiam
        officiis esse vero perspiciatis quam ad ut voluptatem? Consequuntur, consectetur tempore
        optio aperiam sint suscipit odio, sequi ad culpa obcaecati magni inventore ipsa praesentium,
        atque quo mollitia repellendus minus veniam aliquid reprehenderit. Laudantium animi quos
        nihil, perferendis placeat iusto dolor. Quia nobis tempore adipisci debitis dignissimos
        dolorum porro, cum deleniti temporibus necessitatibus, facere similique quibusdam voluptates
        quidem itaque asperiores, molestiae nihil magni optio omnis earum mollitia id. Earum
        accusantium, dolorem veniam porro ipsam dolorum eaque, natus rerum similique, vitae dolores
        ad voluptates inventore hic perferendis doloremque minus amet perspiciatis aliquid iure.
        Laudantium quo quisquam ut voluptatum fugiat placeat, amet provident eos quod, repellat,
        nemo repellendus tempore modi atque quibusdam! Facere, eius tempora. Perferendis fuga amet
        deleniti consequuntur recusandae tempora magni officiis, qui eos corrupti quos quam vitae
        saepe adipisci inventore? At vitae necessitatibus, provident aut error architecto dicta ea
        quasi ab animi eius, quos veniam tempore. Cumque deleniti aspernatur pariatur officia porro
        earum vero iusto corporis eveniet repellat? Officiis dignissimos placeat rerum dolore, quae,
        iste unde veniam veritatis consequatur minima impedit eveniet odio tempore explicabo nulla
        inventore deserunt nemo, incidunt soluta quisquam ipsa porro blanditiis? Voluptatum numquam
        sequi aperiam neque, repellendus at quos esse corporis, blanditiis vel facere pariatur
        nihil! Distinctio eligendi, explicabo praesentium autem voluptas enim nihil corporis ipsam
        ea culpa modi necessitatibus dolore aspernatur facilis velit qui sunt dolores adipisci sint
        corrupti ducimus reprehenderit neque fugit veritatis. Eligendi voluptatem quod dignissimos
        facilis sint ex esse tempora numquam neque voluptatum eaque, obcaecati provident
        consequuntur placeat adipisci porro eveniet mollitia necessitatibus dolorum similique,
        veritatis fugiat dolores. Optio animi corrupti in?
      </section>
    </div>
  </div>
{/if}
