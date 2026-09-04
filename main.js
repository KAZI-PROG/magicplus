import * as THREE from "three";

import { OrbitControls } from
"https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js";

import { gsap } from
"https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";

import { EffectComposer } from
"https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";

import { RenderPass } from
"https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";

import { UnrealBloomPass } from
"https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";

import { createClient } from
"@supabase/supabase-js";


/* =========================================================
   SUPABASE
========================================================= */

const supabase =
    createClient(
        "https://rwluwhiyrbbaiccygafc.supabase.co",
        "sb_publishable_JNOmmXsVDUIDKXTFEpl0UA_1OTV0WkC"
    );


async function fetchProductsByCategory(
    categorySlug
) {

    const { data, error } =
        await supabase
            .from("products")
            .select(
                "id, name, description, price, image_url, categories!inner(slug)"
            )
            .eq("active", true)
            .eq("categories.slug", categorySlug)
            .order("created_at", { ascending: false });

    if (error) {

        throw error;

    }

    return data;

}


function formatPrice(
    price
) {

    return "₹" +
        Number(price).toLocaleString(
            "en-IN"
        );

}


function renderProducts(
    products
) {

    detailProducts.innerHTML =
        "";

    if (
        products.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "products-status";

        empty.textContent =
            "No products live yet.";

        detailProducts.appendChild(
            empty
        );

        return;

    }

    products.forEach(
        product => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "product-card";


            let image;

            if (
                product.image_url
            ) {

                image =
                    document.createElement(
                        "img"
                    );

                image.className =
                    "product-card-image";

                image.src =
                    product.image_url;

                image.alt =
                    product.name;

            } else {

                image =
                    document.createElement(
                        "div"
                    );

                image.className =
                    "product-card-image placeholder";

                image.textContent =
                    product.name
                        .charAt(0);

            }

            card.appendChild(
                image
            );


            const body =
                document.createElement(
                    "div"
                );

            body.className =
                "product-card-body";


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "product-card-name";

            name.textContent =
                product.name;

            body.appendChild(
                name
            );


            if (
                product.description
            ) {

                const description =
                    document.createElement(
                        "div"
                    );

                description.className =
                    "product-card-description";

                description.textContent =
                    product.description;

                body.appendChild(
                    description
                );

            }

            card.appendChild(
                body
            );


            const price =
                document.createElement(
                    "div"
                );

            price.className =
                "product-card-price";

            price.textContent =
                formatPrice(
                    product.price
                );

            card.appendChild(
                price
            );


            const addButton =
                document.createElement(
                    "button"
                );

            addButton.className =
                "add-to-cart-button";

            addButton.textContent =
                "ADD TO CART";

            addButton.addEventListener(
                "click",
                () => {

                    addToCart(
                        product
                    );


                    addButton.textContent =
                        "ADDED";

                    addButton.classList.add(
                        "added"
                    );

                    setTimeout(
                        () => {

                            addButton.textContent =
                                "ADD TO CART";

                            addButton.classList.remove(
                                "added"
                            );

                        },
                        1200
                    );

                }
            );

            card.appendChild(
                addButton
            );


            detailProducts.appendChild(
                card
            );

        }
    );

}


async function loadWorldProducts(
    world
) {

    detailProducts.innerHTML =
        "";

    if (
        !world.categorySlug
    ) return;


    const loading =
        document.createElement(
            "div"
        );

    loading.className =
        "products-status";

    loading.textContent =
        "Loading products…";

    detailProducts.appendChild(
        loading
    );


    try {

        const products =
            await fetchProductsByCategory(
                world.categorySlug
            );


        /* Ignore stale responses if the
           user already left this world */

        if (
            selectedWorld !== world
        ) return;


        renderProducts(
            products
        );

    } catch (error) {

        if (
            selectedWorld !== world
        ) return;


        detailProducts.innerHTML =
            "";


        const errorStatus =
            document.createElement(
                "div"
            );

        errorStatus.className =
            "products-status";

        errorStatus.textContent =
            "Couldn't load products right now.";

        detailProducts.appendChild(
            errorStatus
        );


        console.error(
            "Failed to load products:",
            error
        );

    }

}


/* =========================================================
   CART STATE
========================================================= */

const CART_STORAGE_KEY =
    "kazi-cart";

let cart =
    [];

try {

    const stored =
        localStorage.getItem(
            CART_STORAGE_KEY
        );

    if (
        stored
    ) {

        cart =
            JSON.parse(
                stored
            );

    }

} catch (error) {

    cart =
        [];

}


function saveCart() {

    try {

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(cart)
        );

    } catch (error) {

        /* storage unavailable, cart still
           works for this session */

    }

}


function cartItemCount() {

    return cart.reduce(
        (total, item) =>
            total + item.quantity,
        0
    );

}


function cartTotal() {

    return cart.reduce(
        (total, item) =>
            total + item.price * item.quantity,
        0
    );

}


function addToCart(
    product
) {

    const existing =
        cart.find(
            item => item.id === product.id
        );

    if (
        existing
    ) {

        existing.quantity += 1;

    } else {

        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: 1
        });

    }

    saveCart();

    updateCartBadge();

}


function setItemQuantity(
    productId,
    quantity
) {

    if (
        quantity <= 0
    ) {

        cart =
            cart.filter(
                item => item.id !== productId
            );

    } else {

        const item =
            cart.find(
                entry => entry.id === productId
            );

        if (
            item
        ) {

            item.quantity =
                quantity;

        }

    }

    saveCart();

    updateCartBadge();

    renderCartItems();

}


function updateCartBadge() {

    const count =
        cartItemCount();

    cartBadgeCount.textContent =
        count;

    if (
        count > 0
    ) {

        cartBadge.classList.remove(
            "hidden"
        );

        gsap.fromTo(
            cartBadge,
            { scale: 1.25 },
            { scale: 1, duration: 0.35, ease: "back.out(3)" }
        );

    } else {

        cartBadge.classList.add(
            "hidden"
        );

    }


    /* Rocket only appears once something
       has actually been added to the cart */

    const rocketShouldShow =
        count > 0;

    if (
        cartRocket.visible !== rocketShouldShow
    ) {

        cartRocket.visible =
            rocketShouldShow;

        if (
            rocketShouldShow
        ) {

            gsap.fromTo(
                cartRocket.scale,
                { x: 0, y: 0, z: 0 },
                {
                    x: 0.7,
                    y: 0.7,
                    z: 0.7,
                    duration: 0.6,
                    ease: "back.out(2)"
                }
            );

        }

    }

}


function renderCartItems() {

    cartItemsContainer.innerHTML =
        "";

    if (
        cart.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "products-status";

        empty.textContent =
            "Your cart is empty.";

        cartItemsContainer.appendChild(
            empty
        );

        cartTotalContainer.innerHTML =
            "";

        return;

    }

    cart.forEach(
        item => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "cart-item";


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "cart-item-name";

            name.textContent =
                item.name;

            row.appendChild(
                name
            );


            const qtyWrap =
                document.createElement(
                    "div"
                );

            qtyWrap.className =
                "cart-item-qty";


            const minusButton =
                document.createElement(
                    "button"
                );

            minusButton.textContent =
                "−";

            minusButton.addEventListener(
                "click",
                () => {

                    setItemQuantity(
                        item.id,
                        item.quantity - 1
                    );

                }
            );

            qtyWrap.appendChild(
                minusButton
            );


            const qtyLabel =
                document.createElement(
                    "span"
                );

            qtyLabel.textContent =
                item.quantity;

            qtyWrap.appendChild(
                qtyLabel
            );


            const plusButton =
                document.createElement(
                    "button"
                );

            plusButton.textContent =
                "+";

            plusButton.addEventListener(
                "click",
                () => {

                    setItemQuantity(
                        item.id,
                        item.quantity + 1
                    );

                }
            );

            qtyWrap.appendChild(
                plusButton
            );

            row.appendChild(
                qtyWrap
            );


            const price =
                document.createElement(
                    "div"
                );

            price.className =
                "cart-item-price";

            price.textContent =
                formatPrice(
                    item.price * item.quantity
                );

            row.appendChild(
                price
            );


            const remove =
                document.createElement(
                    "button"
                );

            remove.className =
                "cart-item-remove";

            remove.textContent =
                "✕";

            remove.addEventListener(
                "click",
                () => {

                    setItemQuantity(
                        item.id,
                        0
                    );

                }
            );

            row.appendChild(
                remove
            );


            cartItemsContainer.appendChild(
                row
            );

        }
    );


    cartTotalContainer.innerHTML =
        "";

    const totalLabel =
        document.createElement(
            "span"
        );

    totalLabel.textContent =
        "TOTAL";

    cartTotalContainer.appendChild(
        totalLabel
    );


    const totalValue =
        document.createElement(
            "strong"
        );

    totalValue.textContent =
        formatPrice(
            cartTotal()
        );

    cartTotalContainer.appendChild(
        totalValue
    );

}


function openCart() {

    renderCartItems();

    cartPanel.classList.remove(
        "hidden"
    );

}


function closeCart() {

    cartPanel.classList.add(
        "hidden"
    );

}


/* =========================================================
   CHECKOUT
========================================================= */

function renderCheckoutSummary() {

    checkoutOrderSummary.innerHTML =
        "";

    cart.forEach(
        item => {

            const line =
                document.createElement(
                    "div"
                );

            line.className =
                "checkout-summary-line";

            const name =
                document.createElement(
                    "span"
                );

            name.textContent =
                `${item.name} × ${item.quantity}`;

            const price =
                document.createElement(
                    "span"
                );

            price.textContent =
                formatPrice(
                    item.price * item.quantity
                );

            line.appendChild(name);
            line.appendChild(price);

            checkoutOrderSummary.appendChild(
                line
            );

        }
    );


    const totalLine =
        document.createElement(
            "div"
        );

    totalLine.className =
        "checkout-summary-total";

    const totalLabel =
        document.createElement(
            "span"
        );

    totalLabel.textContent =
        "TOTAL";

    const totalValue =
        document.createElement(
            "strong"
        );

    totalValue.textContent =
        formatPrice(
            cartTotal()
        );

    totalLine.appendChild(totalLabel);
    totalLine.appendChild(totalValue);

    checkoutOrderSummary.appendChild(
        totalLine
    );

}


function resetCheckoutForm() {

    checkoutForm.reset();

    checkoutError.classList.add(
        "hidden"
    );

    checkoutError.textContent =
        "";

    checkoutSubmitButton.disabled =
        false;

    checkoutSubmitButton.textContent =
        "PLACE ORDER";

    checkoutFormState.classList.remove(
        "hidden"
    );

    checkoutSuccessState.classList.add(
        "hidden"
    );

}


function openCheckout() {

    if (
        cart.length === 0
    ) return;


    resetCheckoutForm();

    renderCheckoutSummary();

    checkoutPanel.classList.remove(
        "hidden"
    );

}


function closeCheckout() {

    checkoutPanel.classList.add(
        "hidden"
    );

}


async function handleCheckoutSubmit(
    event
) {

    event.preventDefault();


    if (
        cart.length === 0
    ) return;


    checkoutError.classList.add(
        "hidden"
    );

    checkoutSubmitButton.disabled =
        true;

    checkoutSubmitButton.textContent =
        "PLACING ORDER…";


    const orderPayload = {

        customer_name:
            checkoutNameInput.value.trim(),

        customer_phone:
            checkoutPhoneInput.value.trim(),

        customer_email:
            checkoutEmailInput.value.trim() || null,

        shipping_address:
            checkoutAddressInput.value.trim(),

        notes:
            checkoutNotesInput.value.trim() || null,

        status:
            "pending_payment",

        total:
            cartTotal()

    };


    try {

        const { data: order, error: orderError } =
            await supabase
                .from("orders")
                .insert(orderPayload)
                .select()
                .single();

        if (
            orderError
        ) throw orderError;


        const orderItems =
            cart.map(
                item => ({

                    order_id: order.id,

                    product_id: item.id,

                    product_name: item.name,

                    price: item.price,

                    quantity: item.quantity

                })
            );

        const { error: itemsError } =
            await supabase
                .from("order_items")
                .insert(orderItems);

        if (
            itemsError
        ) throw itemsError;


        /* Success — clear the cart and
           show the confirmation state */

        cart =
            [];

        saveCart();

        updateCartBadge();


        checkoutSuccessId.innerHTML =
            `Order ID: <strong>${order.id.slice(0, 8).toUpperCase()}</strong>`;

        checkoutFormState.classList.add(
            "hidden"
        );

        checkoutSuccessState.classList.remove(
            "hidden"
        );

    } catch (error) {

        checkoutError.textContent =
            "Couldn't place your order — " +
            (error.message || "please try again.");

        checkoutError.classList.remove(
            "hidden"
        );

        checkoutSubmitButton.disabled =
            false;

        checkoutSubmitButton.textContent =
            "PLACE ORDER";

    }

}


/* =========================================================
   ROCKET LAUNCH SOUND
   (synthesized — no external audio file)
========================================================= */

let audioContext =
    null;


function getAudioContext() {

    if (
        !audioContext
    ) {

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

    }

    if (
        audioContext.state === "suspended"
    ) {

        audioContext.resume();

    }

    return audioContext;

}


function playRocketSound() {

    const ctx =
        getAudioContext();

    const now =
        ctx.currentTime;


    /* Ignition burst: filtered white noise */

    const bufferSize =
        ctx.sampleRate * 1.1;

    const noiseBuffer =
        ctx.createBuffer(
            1,
            bufferSize,
            ctx.sampleRate
        );

    const noiseData =
        noiseBuffer.getChannelData(0);

    for (
        let i = 0;
        i < bufferSize;
        i++
    ) {

        noiseData[i] =
            (Math.random() * 2 - 1) *
            (1 - i / bufferSize);

    }

    const noiseSource =
        ctx.createBufferSource();

    noiseSource.buffer =
        noiseBuffer;


    const noiseFilter =
        ctx.createBiquadFilter();

    noiseFilter.type =
        "lowpass";

    noiseFilter.frequency.setValueAtTime(
        250,
        now
    );

    noiseFilter.frequency.exponentialRampToValueAtTime(
        4500,
        now + 0.5
    );

    noiseFilter.frequency.exponentialRampToValueAtTime(
        180,
        now + 1.1
    );


    const noiseGain =
        ctx.createGain();

    noiseGain.gain.setValueAtTime(
        0.0001,
        now
    );

    noiseGain.gain.exponentialRampToValueAtTime(
        0.5,
        now + 0.12
    );

    noiseGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 1.1
    );


    noiseSource.connect(
        noiseFilter
    );

    noiseFilter.connect(
        noiseGain
    );

    noiseGain.connect(
        ctx.destination
    );


    /* Rising pitch whoosh */

    const osc =
        ctx.createOscillator();

    osc.type =
        "sawtooth";

    osc.frequency.setValueAtTime(
        90,
        now
    );

    osc.frequency.exponentialRampToValueAtTime(
        520,
        now + 0.9
    );


    const oscGain =
        ctx.createGain();

    oscGain.gain.setValueAtTime(
        0.0001,
        now
    );

    oscGain.gain.exponentialRampToValueAtTime(
        0.18,
        now + 0.15
    );

    oscGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.9
    );


    osc.connect(
        oscGain
    );

    oscGain.connect(
        ctx.destination
    );


    noiseSource.start(
        now
    );

    noiseSource.stop(
        now + 1.1
    );

    osc.start(
        now
    );

    osc.stop(
        now + 0.9
    );

}


/* =========================================================
   BASIC SETUP
========================================================= */

const canvas = document.getElementById("cosmos");

const loadingScreen =
    document.getElementById("loading-screen");

const intro =
    document.getElementById("intro");

const worldPanel =
    document.getElementById("world-panel");

const worldTitle =
    document.getElementById("world-title");

const worldDescription =
    document.getElementById("world-description");

const worldButtons =
    document.getElementById("world-buttons");

const enterButton =
    document.getElementById("enter-universe");

const diveButton =
    document.getElementById("dive-button");

const returnButton =
    document.getElementById("return-button");

const worldDetail =
    document.getElementById("world-detail");

const detailTitle =
    document.getElementById("detail-title");

const detailStatusText =
    document.getElementById("detail-status-text");

const detailDescription =
    document.getElementById("detail-description");

const detailFocus =
    document.getElementById("detail-focus");

const detailProducts =
    document.getElementById("detail-products");

const detailReturnButton =
    document.getElementById("detail-return-button");

const cartBadge =
    document.getElementById("cart-badge");

const cartBadgeCount =
    document.getElementById("cart-badge-count");

const cartPanel =
    document.getElementById("cart-panel");

const cartItemsContainer =
    document.getElementById("cart-items");

const cartTotalContainer =
    document.getElementById("cart-total");

const cartReturnButton =
    document.getElementById("cart-return-button");


const checkoutButton =
    document.getElementById("checkout-button");

const checkoutPanel =
    document.getElementById("checkout-panel");

const checkoutFormState =
    document.getElementById("checkout-form-state");

const checkoutSuccessState =
    document.getElementById("checkout-success-state");

const checkoutForm =
    document.getElementById("checkout-form");

const checkoutNameInput =
    document.getElementById("checkout-name");

const checkoutPhoneInput =
    document.getElementById("checkout-phone");

const checkoutEmailInput =
    document.getElementById("checkout-email");

const checkoutAddressInput =
    document.getElementById("checkout-address");

const checkoutNotesInput =
    document.getElementById("checkout-notes");

const checkoutOrderSummary =
    document.getElementById("checkout-order-summary");

const checkoutError =
    document.getElementById("checkout-error");

const checkoutBackButton =
    document.getElementById("checkout-back-button");

const checkoutSubmitButton =
    document.getElementById("checkout-submit-button");

const checkoutSuccessId =
    document.getElementById("checkout-success-id");

const checkoutDoneButton =
    document.getElementById("checkout-done-button");


cartBadge.addEventListener(
    "click",
    openCart
);


cartReturnButton.addEventListener(
    "click",
    closeCart
);


checkoutButton.addEventListener(
    "click",
    openCheckout
);


checkoutBackButton.addEventListener(
    "click",
    closeCheckout
);


checkoutForm.addEventListener(
    "submit",
    handleCheckoutSubmit
);


checkoutDoneButton.addEventListener(
    "click",
    () => {

        closeCheckout();

        closeCart();

        returnButton.click();

    }
);


/* =========================================================
   WORLDS
========================================================= */

const worlds = [

    {
        name: "EDITING",
        slug: "editing",
        categorySlug: "editing",
        description:
            "Crafting motion, stories and attention.",

        status: "BUILDING THIS WORLD",

        focus: [
            "Case studies are being edited into this world.",
            "Cuts, color and sound design samples land here soon."
        ],

        position: [-25, 8, -10],

        color: 0xff5b00
    },

    {
        name: "DESIGN",
        slug: "design",
        categorySlug: "design",
        description:
            "Turning ideas into powerful visual identities.",

        status: "BUILDING THIS WORLD",

        focus: [
            "Visual identity work is being catalogued here.",
            "Logos, posters and brand systems, on the way."
        ],

        position: [25, 12, -12],

        color: 0xff8a20
    },

    {
        name: "WEB",
        slug: "web",
        categorySlug: "web",
        description:
            "Building digital spaces people remember.",

        status: "BUILDING THIS WORLD",

        focus: [
            "Project write-ups are in progress.",
            "Live builds and source will land here soon."
        ],

        position: [30, -12, -18],

        color: 0xff6a00
    },

    {
        name: "AI",
        slug: "ai",
        categorySlug: "ai",
        description:
            "Intelligence built into the web, not bolted on.",

        status: "BUILDING THIS WORLD",

        focus: [
            "This world covers AI features built directly into web apps — not a separate service.",
            "Examples are being added as the WEB world fills in."
        ],

        position: [-28, -14, -16],

        color: 0xff9a32
    }

];


/* =========================================================
   RENDERER
========================================================= */

const renderer =
    new THREE.WebGLRenderer({

        canvas: canvas,

        antialias: true,

        powerPreference: "high-performance"

    });


renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.outputColorSpace =
    THREE.SRGBColorSpace;


/* =========================================================
   SCENE
========================================================= */

const scene =
    new THREE.Scene();

scene.background =
    new THREE.Color(0x020202);


/* =========================================================
   CAMERA
========================================================= */

const camera =
    new THREE.PerspectiveCamera(

        55,

        window.innerWidth /
        window.innerHeight,

        0.1,

        2500

    );


camera.position.set(
    0,
    6,
    85
);


scene.add(
    camera
);


/* =========================================================
   BLOOM / GLOW
========================================================= */

const composer =
    new EffectComposer(renderer);

composer.addPass(
    new RenderPass(scene, camera)
);

const bloomPass =
    new UnrealBloomPass(
        new THREE.Vector2(
            window.innerWidth,
            window.innerHeight
        ),
        0.85,   // strength
        0.6,    // radius
        0.15    // threshold — only brighter/emissive things bloom
    );

composer.addPass(bloomPass);


/* =========================================================
   CART ROCKET
   (3D object parked in view — click to open cart)
========================================================= */

const cartRocket =
    new THREE.Group();


const rocketBody =
    new THREE.Mesh(

        new THREE.CylinderGeometry(
            0.42,
            0.42,
            2.1,
            16
        ),

        new THREE.MeshStandardMaterial({

            color: 0xf5f1eb,

            emissive: 0xf5f1eb,

            emissiveIntensity: 0.15,

            metalness: 0.5,

            roughness: 0.3

        })

    );

cartRocket.add(
    rocketBody
);


const rocketNose =
    new THREE.Mesh(

        new THREE.ConeGeometry(
            0.42,
            0.9,
            16
        ),

        new THREE.MeshStandardMaterial({

            color: 0xff6500,

            emissive: 0xff3200,

            emissiveIntensity: 0.6,

            metalness: 0.5,

            roughness: 0.25

        })

    );

rocketNose.position.y =
    1.5;

cartRocket.add(
    rocketNose
);


const rocketWindow =
    new THREE.Mesh(

        new THREE.SphereGeometry(
            0.18,
            16,
            16
        ),

        new THREE.MeshStandardMaterial({

            color: 0x88d9ff,

            emissive: 0x2a7fb0,

            emissiveIntensity: 0.8,

            metalness: 0.2,

            roughness: 0.1

        })

    );

rocketWindow.position.set(
    0,
    0.4,
    0.38
);

cartRocket.add(
    rocketWindow
);


for (
    let i = 0;
    i < 3;
    i++
) {

    const fin =
        new THREE.Mesh(

            new THREE.ConeGeometry(
                0.22,
                0.7,
                4
            ),

            new THREE.MeshStandardMaterial({

                color: 0xff6500,

                metalness: 0.5,

                roughness: 0.35

            })

        );

    const angle =
        (i / 3) *
        Math.PI *
        2;

    fin.position.set(
        Math.cos(angle) * 0.42,
        -0.9,
        Math.sin(angle) * 0.42
    );

    fin.rotation.x =
        Math.PI;

    fin.rotation.y =
        angle;

    cartRocket.add(
        fin
    );

}


const rocketFlame =
    new THREE.Mesh(

        new THREE.ConeGeometry(
            0.3,
            0.8,
            12
        ),

        new THREE.MeshBasicMaterial({

            color: 0xffb84d,

            transparent: true,

            opacity: 0.85,

            blending: THREE.AdditiveBlending

        })

    );

rocketFlame.rotation.x =
    Math.PI;

rocketFlame.position.y =
    -1.5;

cartRocket.add(
    rocketFlame
);


const rocketLight =
    new THREE.PointLight(
        0xff8a20,
        3,
        6
    );

rocketLight.position.y =
    -1.2;

cartRocket.add(
    rocketLight
);


/* Position relative to the camera so it always
   stays in view, top-right, tilted like it's
   ready to launch */

cartRocket.position.set(
    8,
    4.5,
    -11
);

cartRocket.rotation.z =
    -0.35;

cartRocket.scale.setScalar(
    0.7
);


/* Self-contained fill light so the rocket is always
   properly lit, wherever the camera is in the universe —
   it no longer depends on distant scene lights */

const rocketFillLight =
    new THREE.PointLight(
        0xfff2e0,
        4,
        5
    );

rocketFillLight.position.set(
    0,
    0.6,
    1.2
);

cartRocket.add(
    rocketFillLight
);


/* Hidden until the first item is added to the cart */

cartRocket.visible =
    false;

camera.add(
    cartRocket
);


const cartRocketParts = [
    rocketBody,
    rocketNose,
    rocketWindow,
    rocketFlame
];


let rocketIdling =
    true;


function launchCartRocket() {

    rocketIdling =
        false;


    playRocketSound();


    const timeline =
        gsap.timeline();


    /* Engine shake before takeoff */

    timeline.to(
        cartRocket.rotation,
        {

            z: -0.35 + 0.15,

            duration: 0.08,

            ease: "power1.inOut",

            yoyo: true,

            repeat: 3

        }
    );


    /* Flight path — the rocket loops and banks
       across the visible space before finally
       diving toward the cart badge, bottom-right */

    timeline.to(
        cartRocket.position,
        {

            x: -6,
            y: 8,
            z: -7,

            duration: 0.75,

            ease: "power2.out"

        }
    );

    timeline.to(
        cartRocket.rotation,
        {

            z: 0.6,

            duration: 0.75,

            ease: "power2.out"

        },
        "<"
    );


    timeline.to(
        cartRocket.position,
        {

            x: 9,
            y: 9.5,
            z: -4,

            duration: 0.75,

            ease: "sine.inOut"

        }
    );

    timeline.to(
        cartRocket.rotation,
        {

            z: -0.9,

            duration: 0.75,

            ease: "sine.inOut"

        },
        "<"
    );


    timeline.to(
        cartRocket.position,
        {

            x: -4,
            y: 1,
            z: -9,

            duration: 0.68,

            ease: "sine.inOut"

        }
    );

    timeline.to(
        cartRocket.rotation,
        {

            z: 0.75,

            duration: 0.68,

            ease: "sine.inOut"

        },
        "<"
    );


    /* Final dive toward the cart badge
       (bottom-right corner) */

    timeline.to(
        cartRocket.position,
        {

            x: 12,
            y: -8.5,
            z: -3,

            duration: 0.68,

            ease: "power2.in"

        }
    );

    timeline.to(
        cartRocket.rotation,
        {

            z: -1.1,

            duration: 0.68,

            ease: "power2.in"

        },
        "<"
    );

    timeline.to(
        cartRocket.scale,
        {

            x: 0.14,
            y: 0.14,
            z: 0.14,

            duration: 0.68,

            ease: "power2.in",

            onComplete: () => {

                openCart();

            }

        },
        "<"
    );


    timeline.set(
        cartRocket.position,
        {

            x: 8,
            y: 4.5,
            z: -11

        }
    );


    timeline.set(
        cartRocket.rotation,
        {

            z: -0.35

        }
    );


    timeline.to(
        cartRocket.scale,
        {

            x: 0.7,
            y: 0.7,
            z: 0.7,

            duration: 0.6,

            ease: "back.out(2)",

            onComplete: () => {

                rocketIdling =
                    true;

            }

        }
    );

}


cartReturnButton.addEventListener(
    "click",
    () => {

        /* landing animation when returning
           from the cart */

        gsap.fromTo(
            cartRocket.scale,
            { x: 0.3, y: 0.3, z: 0.3 },
            { x: 0.7, y: 0.7, z: 0.7, duration: 0.4, ease: "back.out(2)" }
        );

    }
);


/* =========================================================
   CONTROLS
========================================================= */

const controls =
    new OrbitControls(
        camera,
        renderer.domElement
    );


controls.enableDamping = true;

controls.enablePan = false;

controls.minDistance = 25;

controls.maxDistance = 150;

controls.autoRotate = true;

controls.autoRotateSpeed = 0.12;


/* =========================================================
   UNIVERSE GROUP
========================================================= */

const universe =
    new THREE.Group();

scene.add(universe);


/* =========================================================
   LIGHTING
========================================================= */

const ambientLight =
    new THREE.AmbientLight(
        0x24150d,
        1.5
    );

scene.add(ambientLight);


const orangeLight =
    new THREE.PointLight(
        0xff5b00,
        20,
        120
    );

orangeLight.position.set(
    0,
    0,
    10
);

scene.add(orangeLight);


/* =========================================================
   KAZI CORE
========================================================= */

const coreGeometry =
    new THREE.IcosahedronGeometry(
        4.5,
        5
    );


const coreMaterial =
    new THREE.MeshStandardMaterial({

        color: 0xff4d00,

        emissive: 0xff3200,

        emissiveIntensity: 2,

        metalness: 0.7,

        roughness: 0.25

    });


const core =
    new THREE.Mesh(
        coreGeometry,
        coreMaterial
    );


universe.add(core);


/* =========================================================
   CORE ORBITS
========================================================= */

for (
    let i = 0;
    i < 5;
    i++
) {

    const orbit =
        new THREE.Mesh(

            new THREE.TorusGeometry(
                8 + i * 2.5,
                0.035,
                8,
                180
            ),

            new THREE.MeshBasicMaterial({

                color: 0xff6500,

                transparent: true,

                opacity:
                    0.25 - i * 0.025,

                blending:
                    THREE.AdditiveBlending

            })

        );


    orbit.rotation.x =
        0.5 + i * 0.17;

    orbit.rotation.y =
        i * 0.55;

    universe.add(orbit);

}


/* =========================================================
   STAR FIELD
========================================================= */

function createCircleTexture() {

    const canvas =
        document.createElement("canvas");

    canvas.width = 64;
    canvas.height = 64;

    const ctx =
        canvas.getContext("2d");

    const gradient =
        ctx.createRadialGradient(
            32, 32, 0,
            32, 32, 32
        );

    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);

}


const circleSprite =
    createCircleTexture();


function createStars(
    amount,
    minimumRadius,
    maximumRadius,
    size
) {

    const positions =
        new Float32Array(
            amount * 3
        );


    for (
        let i = 0;
        i < amount;
        i++
    ) {

        const radius =
            THREE.MathUtils.randFloat(
                minimumRadius,
                maximumRadius
            );


        const theta =
            Math.random() *
            Math.PI *
            2;


        const phi =
            Math.acos(
                THREE.MathUtils.randFloatSpread(2)
            );


        positions[i * 3] =
            radius *
            Math.sin(phi) *
            Math.cos(theta);


        positions[i * 3 + 1] =
            radius *
            Math.cos(phi);


        positions[i * 3 + 2] =
            radius *
            Math.sin(phi) *
            Math.sin(theta);

    }


    const geometry =
        new THREE.BufferGeometry();


    geometry.setAttribute(

        "position",

        new THREE.BufferAttribute(
            positions,
            3
        )

    );


    const material =
        new THREE.PointsMaterial({

            color: 0xffb276,

            size: size,

            map: circleSprite,

            transparent: true,

            opacity: 0.75,

            alphaTest: 0.05,

            depthWrite: false,

            blending:
                THREE.AdditiveBlending

        });


    return new THREE.Points(
        geometry,
        material
    );

}


const stars =
    createStars(
        window.innerWidth < 700
            ? 3000
            : 7000,

        100,

        900,

        0.55
    );


scene.add(stars);


/* =========================================================
   ORANGE COSMIC DUST
========================================================= */

const cosmicDust =
    createStars(
        1800,
        15,
        100,
        0.9
    );


cosmicDust.material.opacity =
    0.12;


universe.add(
    cosmicDust
);


/* =========================================================
   WORLD CREATION
========================================================= */

const worldObjects = [];

const clickableObjects = [];


worlds.forEach(
    (world, index) => {

        const group =
            new THREE.Group();


        group.position.set(
            world.position[0],
            world.position[1],
            world.position[2]
        );


        group.userData.world =
            world;


        /* WORLD ORB */

        const orb =
            new THREE.Mesh(

                new THREE.SphereGeometry(
                    2.8,
                    40,
                    40
                ),

                new THREE.MeshStandardMaterial({

                    color: world.color,

                    emissive: world.color,

                    emissiveIntensity: 1.4,

                    transparent: true,

                    opacity: 0.4,

                    metalness: 0.5,

                    roughness: 0.2

                })

            );


        group.add(orb);


        /* WORLD RING */

        const ring =
            new THREE.Mesh(

                new THREE.TorusGeometry(
                    5.3,
                    0.12,
                    16,
                    120
                ),

                new THREE.MeshBasicMaterial({

                    color: world.color,

                    transparent: true,

                    opacity: 0.85,

                    blending:
                        THREE.AdditiveBlending

                })

            );


        ring.rotation.x =
            Math.PI / 2;


        group.add(ring);


        /* SECOND RING */

        const ring2 =
            new THREE.Mesh(

                new THREE.TorusGeometry(
                    6.7,
                    0.035,
                    10,
                    120
                ),

                new THREE.MeshBasicMaterial({

                    color: 0xffa15c,

                    transparent: true,

                    opacity: 0.4,

                    blending:
                        THREE.AdditiveBlending

                })

            );


        ring2.rotation.y =
            Math.PI / 3;


        group.add(ring2);


        /* WORLD LIGHT */

        const worldLight =
            new THREE.PointLight(
                world.color,
                8,
                25
            );


        group.add(
            worldLight
        );


        /* SMALL ORBITING SATELLITES */

        for (
            let j = 0;
            j < 4;
            j++
        ) {

            const satellite =
                new THREE.Mesh(

                    new THREE.SphereGeometry(
                        0.16,
                        12,
                        12
                    ),

                    new THREE.MeshBasicMaterial({

                        color: 0xffc078

                    })

                );


            const angle =
                j *
                Math.PI *
                2 /
                4;


            satellite.position.set(

                Math.cos(angle) * 7,

                Math.sin(angle) * 3.5,

                Math.sin(angle * 2) * 2

            );


            group.add(
                satellite
            );

        }


        universe.add(
            group
        );


        worldObjects.push(
            group
        );


        clickableObjects.push(
            orb,
            ring,
            ring2
        );


        /* NAVIGATION BUTTON */

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "world-button";


        button.textContent =
            world.name;


        button.addEventListener(
            "click",
            () => {

                selectWorld(
                    world
                );

            }
        );


        worldButtons.appendChild(
            button
        );


        world.button =
            button;

    }
);


/* =========================================================
   WORLD SELECTION
========================================================= */

let selectedWorld =
    null;


function selectWorld(
    world
) {

    selectedWorld =
        world;


    intro.classList.add(
        "hidden"
    );


    worldPanel.classList.remove(
        "hidden"
    );


    worldTitle.textContent =
        world.name;


    worldDescription.textContent =
        world.description;


    worlds.forEach(
        item => {

            item.button.classList.toggle(

                "active",

                item === world

            );

        }
    );


    controls.autoRotate =
        false;


    const target =
        world.position;


    gsap.to(
        camera.position,
        {

            x: target[0] * 0.45,

            y: target[1] * 0.45,

            z: target[2] * 0.45 + 50,

            duration: 1.5,

            ease: "power3.inOut"

        }
    );


    gsap.to(
        controls.target,
        {

            x: target[0] * 0.7,

            y: target[1] * 0.7,

            z: target[2] * 0.7,

            duration: 1.5,

            ease: "power3.inOut"

        }
    );

}


/* =========================================================
   ENTER UNIVERSE
========================================================= */

enterButton.addEventListener(
    "click",
    () => {

        intro.classList.add(
            "hidden"
        );


        controls.autoRotate =
            true;


        gsap.to(
            camera.position,
            {

                z: 65,

                duration: 1.5,

                ease: "power3.out"

            }
        );

    }
);


/* =========================================================
   WORLD DETAIL OVERLAY
========================================================= */

function showWorldDetail(
    world
) {

    const glowColor =
        "#" +
        world.color
            .toString(16)
            .padStart(6, "0");

    worldDetail.style.setProperty(
        "--world-glow",
        glowColor
    );

    detailTitle.textContent =
        world.name;

    detailTitle.style.color =
        glowColor;

    detailStatusText.textContent =
        world.status;

    detailDescription.textContent =
        world.description;

    detailFocus.innerHTML =
        "";

    world.focus.forEach(
        line => {

            const item =
                document.createElement(
                    "li"
                );

            item.textContent =
                line;

            item.style.setProperty(
                "--dot-color",
                glowColor
            );

            detailFocus.appendChild(
                item
            );

        }
    );

    worldDetail.classList.remove(
        "hidden"
    );


    loadWorldProducts(
        world
    );


    /* Staggered reveal, once per open */

    const revealItems = [
        detailTitle,
        document.getElementById("detail-status"),
        detailDescription,
        ...detailFocus.children,
        detailReturnButton
    ];

    gsap.fromTo(
        revealItems,
        {
            opacity: 0,
            y: 16
        },
        {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.07,
            delay: 0.1
        }
    );

}


function hideWorldDetail() {

    worldDetail.classList.add(
        "hidden"
    );

}


/* =========================================================
   DIVE INTO WORLD
========================================================= */

diveButton.addEventListener(
    "click",
    () => {

        if (
            !selectedWorld
        ) return;


        worldPanel.classList.add(
            "hidden"
        );


        const target =
            selectedWorld.position;


        gsap.to(
            camera.position,
            {

                x:
                    target[0] * 0.9,

                y:
                    target[1] * 0.9,

                z:
                    target[2] * 0.9 + 8,

                duration: 2.2,

                ease: "power4.inOut",

                onComplete: () => {

                    showWorldDetail(
                        selectedWorld
                    );

                }

            }
        );


        gsap.to(
            universe.rotation,
            {

                y:
                    universe.rotation.y +
                    Math.PI * 0.5,

                duration: 2.2,

                ease: "power4.inOut"

            }
        );

    }
);


/* =========================================================
   RETURN TO UNIVERSE
========================================================= */

returnButton.addEventListener(
    "click",
    () => {

        selectedWorld =
            null;


        worldPanel.classList.add(
            "hidden"
        );


        hideWorldDetail();


        worlds.forEach(
            world => {

                world.button.classList.remove(
                    "active"
                );

            }
        );


        controls.autoRotate =
            true;


        gsap.to(
            camera.position,
            {

                x: 0,

                y: 6,

                z: 85,

                duration: 1.7,

                ease: "power3.inOut"

            }
        );


        gsap.to(
            controls.target,
            {

                x: 0,

                y: 0,

                z: 0,

                duration: 1.7,

                ease: "power3.inOut",

                onComplete: () => {

                    /* If something's already in the cart,
                       greet the return with a quick universe
                       spin, then let the rocket fly the
                       cart open */

                    if (
                        cart.length === 0
                    ) return;


                    gsap.to(
                        universe.rotation,
                        {

                            y:
                                universe.rotation.y +
                                Math.PI * 0.65,

                            duration: 1.3,

                            ease: "power2.inOut",

                            onComplete: () => {

                                launchCartRocket();

                            }

                        }
                    );

                }

            }
        );

    }
);


detailReturnButton.addEventListener(
    "click",
    () => {

        returnButton.click();

    }
);


/* =========================================================
   MOUSE INTERACTION
========================================================= */

const raycaster =
    new THREE.Raycaster();


const mouse =
    new THREE.Vector2();


let hoveredWorld =
    null;


let hoveredRocket =
    false;


canvas.addEventListener(
    "pointermove",
    event => {

        mouse.x =
            (event.clientX /
                window.innerWidth) *
            2 - 1;


        mouse.y =
            -(event.clientY /
                window.innerHeight) *
            2 + 1;


        raycaster.setFromCamera(
            mouse,
            camera
        );


        const rocketHits =
            cartRocket.visible
                ? raycaster.intersectObjects(
                    cartRocketParts
                )
                : [];


        if (
            rocketHits.length > 0
        ) {

            hoveredRocket =
                true;

            hoveredWorld =
                null;

            canvas.style.cursor =
                "pointer";

            return;

        }

        hoveredRocket =
            false;


        const hits =
            raycaster.intersectObjects(
                clickableObjects
            );


        if (
            hits.length > 0
        ) {

            hoveredWorld =
                hits[0]
                    .object
                    .parent
                    .userData
                    .world;


            canvas.style.cursor =
                "pointer";

        }

        else {

            hoveredWorld =
                null;

            canvas.style.cursor =
                "grab";

        }

    }
);


canvas.addEventListener(
    "click",
    () => {

        if (
            hoveredRocket
        ) {

            launchCartRocket();

            return;

        }


        if (
            hoveredWorld
        ) {

            selectWorld(
                hoveredWorld
            );

        }

    }
);


/* =========================================================
   ESCAPE KEY
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            if (
                !checkoutPanel.classList.contains("hidden")
            ) {

                closeCheckout();

                return;

            }

            if (
                !cartPanel.classList.contains("hidden")
            ) {

                closeCart();

                return;

            }

            returnButton.click();

        }

    }
);


/* =========================================================
   RESPONSIVE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;


        camera.updateProjectionMatrix();


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        composer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
);


/* =========================================================
   ANIMATION
========================================================= */

function animate() {

    requestAnimationFrame(
        animate
    );


    controls.update();


    stars.rotation.y +=
        0.00008;


    cosmicDust.rotation.y +=
        0.0003;


    universe.rotation.y +=
        0.00012;


    core.rotation.x +=
        0.002;


    core.rotation.y +=
        0.003;


    worldObjects.forEach(
        (object, index) => {

            object.rotation.y +=
                0.0015;


            object.position.y =
                worlds[index].position[1] +
                Math.sin(
                    performance.now() *
                    0.0007 +
                    index
                ) *
                0.35;

        }
    );


    /* Rocket idling — gentle bob and
       flickering engine flame */

    const idleTime =
        performance.now() *
        0.002;

    rocketFlame.scale.y =
        1 +
        Math.sin(idleTime * 6) *
        0.25;

    rocketFlame.scale.x =
        1 +
        Math.sin(idleTime * 6) *
        0.08;

    rocketLight.intensity =
        2.5 +
        Math.sin(idleTime * 6) *
        1.2;

    if (
        rocketIdling
    ) {

        cartRocket.position.y =
            4.5 +
            Math.sin(idleTime) *
            0.25;

    }


    composer.render();

}


/* =========================================================
   START
========================================================= */

setTimeout(
    () => {

        loadingScreen.classList.add(
            "loaded"
        );

    },
    1800
);


updateCartBadge();


animate();