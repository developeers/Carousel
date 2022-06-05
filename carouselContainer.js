import store from "./store.js";

const containerStyle = `
  <style>
    #carousel-container {
        position: relative;
        width: 850px;
        margin: 0 auto;
    }

    #carousel {
        display: flex;
        align-items: center;
        gap: 30px;
        overflow-x: hidden;
        width: 100%;
        margin: 0 auto;
        padding-top: 50px;
        padding-bottom: 50px;
        scroll-behavior: smooth;
        scrollbar-width: none;
    }

    #carousel::-webkit-scrollbar {
        height: 0;
    }

    .arrow {
        width: 15px;
        height: 15px;
        border-top: 5px solid;
        border-right: 5px solid;
        border-color: cadetblue;
        border-top-right-radius: 5px;
    }

    .left-arrow {
        transform: translateY(-50%) rotate(-135deg);
    }

    .right-arrow {
        transform: translateY(-50%) rotate(45deg);
    }

    #prev-button,
    #next-button {
        position: absolute;
        top: 50%;
        cursor: pointer;
    }

    #prev-button {
        left: -50px;
        display: none;
    }

    #next-button {
        right: -50px;
    }
  </style>
`;

const containerTemplate = document.createElement("template");
containerTemplate.innerHTML =
  containerStyle +
  `
  <div id="carousel-container">
    <div id="prev-button" class="arrow left-arrow"></div>
    <div id="next-button" class="arrow right-arrow"></div>
    <div id="carousel">
      <slot></slot>
    </div>
  </div>`;
const slideTime = 100; // ms

class CarouselContainer extends HTMLElement {
  constructor() {
    super();
    const _self = this;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(containerTemplate.content.cloneNode(true));
    this.prevClickTime = Date.now();
    this.prevButton = this.shadowRoot.getElementById("prev-button");
    this.nextButton = this.shadowRoot.getElementById("next-button");
    this.isSlideRight = true;
    this.carousel = this.shadowRoot.getElementById("carousel");
    this.focusedItemIndexProxy = new Proxy(
      { value: 3 },
      {
        set(target, prop, newValue, _receiver) {
          if (prop != "value") {
            return false;
          }
          _self.updateFocusedItem(target.value, false);
          target.value = newValue;
          _self.updateFocusedItem(newValue);
          return true;
        },
      }
    );
    this.carouselWidth = 850;
    this.slideDistance = 180;
  }
  calculateCarouselSizeParameters() {
    const globalState = store.getInstance().state;
    this.carouselWidth =
      4 * globalState.carouselItemGap +
      2 * globalState.carouselItemWidth +
      2 * globalState.carouselSmallItemWidth +
      globalState.carouselFocusedItemWidth;
    this.slideDistance =
      globalState.carouselItemWidth + globalState.carouselItemGap;
  }
  connectedCallback() {
    this.prevButton.onclick = () => {
      if (Date.now() - this.prevClickTime < 200) {
        return;
      }
      this.prevClickTime = Date.now();
      this.isSlideRight = false;
      this.nextButton.style.display = "block";
      this.carousel.scrollBy(-this.slideDistance, 0);
      const timerId = setTimeout(() => {
        this.focusedItemIndexProxy.value -= 1;
        if (this.getScrollLeftValue() == 0) {
          this.prevButton.style.display = "none";
        }
        clearTimeout(timerId);
      }, slideTime);
    };
    this.nextButton.onclick = () => {
      if (Date.now() - this.prevClickTime < 200) {
        return;
      }
      this.prevClickTime = Date.now();
      this.isSlideRight = true;
      this.prevButton.style.display = "block";
      this.carousel.scrollBy(this.slideDistance, 0);
      const timerId = setTimeout(() => {
        this.focusedItemIndexProxy.value += 1;
        if (
          this.getScrollLeftValue() + this.carouselWidth >=
          this.carousel.scrollWidth
        ) {
          this.nextButton.style.display = "none";
        }
        clearTimeout(timerId);
      }, slideTime);
    };

    this.childListObserver = new MutationObserver(
      this.initFocusedCarouselItem.bind(this)
    );
    this.childListObserver.observe(this, { childList: true });
    setTimeout(() => {
      this.focusedItemIndexProxy.value = 3;
    }, 100);
    window.onresize = () => {
      this.updateCarouselSize();
    };
    this.updateCarouselSize();
  }
  initFocusedCarouselItem() {
    if (this.childElementCount < this.focusedItemIndexProxy.value + 2) {
      return;
    }
    this.focusedItemIndexProxy.value = 3;
  }
  updateFocusedItem(itemIndex, makeFocused = true) {
    const focusedCarouselItemHtml = this.children
      .item(itemIndex - 1)
      .shadowRoot.querySelector(".carousel-item");
    const smallCarouselItemLeftHtml = this.children
      .item(itemIndex - 3)
      .shadowRoot.querySelector(".carousel-item");
    const smallCarouselItemRightHtml = this.children
      .item(itemIndex + 1)
      .shadowRoot.querySelector(".carousel-item");

    if (makeFocused) {
      focusedCarouselItemHtml.classList.add("focused-item");
      smallCarouselItemRightHtml.classList.remove("hide");
      smallCarouselItemLeftHtml.classList.remove("hide");
      smallCarouselItemLeftHtml.classList.add("small-item");
      smallCarouselItemRightHtml.classList.add("small-item");
    } else {
      focusedCarouselItemHtml.classList.remove("focused-item");
      if (this.isSlideRight) {
        smallCarouselItemLeftHtml.classList.add("hide");
      } else {
        smallCarouselItemRightHtml.classList.add("hide");
      }
      smallCarouselItemLeftHtml.classList.remove("small-item");
      smallCarouselItemRightHtml.classList.remove("small-item");
    }
  }
  // Use this function instead of carousel.scrollLeft
  // because the scrollLeft value is not completely updated until the scroll action has finished.
  // At the moment, there is not a standard method to determine if the scroll has finished.
  // A common workaround is to use a timer (~500ms) to wait for the completion of the scroll action.
  getScrollLeftValue() {
    const globalState = store.getInstance().state;
    return (
      (this.focusedItemIndexProxy.value - 3) *
      (globalState.carouselItemWidth + globalState.carouselItemGap)
    );
  }
  updateCssPropertyValues() {
    const constructedStyleSheet = new CSSStyleSheet();
    const globalState = store.getInstance().state;
    const styleSheetContent = `
      #carousel-container { width: ${this.carouselWidth}px }
      #carousel { gap: ${globalState.carouselItemGap}px }
      .arrow {
        width: ${globalState.slideButtonSize}px;
        height: ${globalState.slideButtonSize}px;
      }
      #prev-button {
        left: ${globalState.slideButtonDistance}px;
      }
      #next-button {
        right: ${globalState.slideButtonDistance}px;
      }
    `;
    constructedStyleSheet.replaceSync(styleSheetContent);
    this.shadowRoot.adoptedStyleSheets = [constructedStyleSheet];
  }
  updateCarouselSize() {
    const containerWidth = this.parentElement.offsetWidth;
    const updateStateAndCss = (newState) => {
      store.getInstance().state = newState;
      this.calculateCarouselSizeParameters();
      this.updateCssPropertyValues();
    };
    if (containerWidth >= 960) {
      const newStoreState = {
        carouselItemWidth: 150,
        carouselFocusedItemWidth: 200,
        carouselSmallItemWidth: 115,
        carouselItemGap: 30,
        carouselItemFontSize: 24,
        carouselFocusedItemFontSize: 26,
        carouselSmallItemFontSize: 18,
        slideButtonSize: 15,
        slideButtonDistance: -50,
      };
      updateStateAndCss(newStoreState);
    } else if (containerWidth >= 600) {
      const newStoreState = {
        carouselItemWidth: 90,
        carouselFocusedItemWidth: 120,
        carouselSmallItemWidth: 60,
        carouselItemGap: 20,
        carouselItemFontSize: 16,
        carouselFocusedItemFontSize: 20,
        carouselSmallItemFontSize: 13,
        slideButtonSize: 15,
        slideButtonDistance: -50,
      };
      updateStateAndCss(newStoreState);
    } else {
      const newStoreState = {
        carouselItemWidth: 60,
        carouselFocusedItemWidth: 90,
        carouselSmallItemWidth: 40,
        carouselItemGap: 15,
        carouselItemFontSize: 12,
        carouselFocusedItemFontSize: 15,
        carouselSmallItemFontSize: 9,
        slideButtonSize: 12,
        slideButtonDistance: -40,
      };
      updateStateAndCss(newStoreState);
    }
  }
}

export default CarouselContainer;
