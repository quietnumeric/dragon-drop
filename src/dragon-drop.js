const calcAxisByAbsoluteRects = true;
const usingMousePositionAxesPage = true;
const mousePositionAxes = {
  x: usingMousePositionAxesPage ? 'pageX' : 'clientX',
  y: usingMousePositionAxesPage ? 'pageY' : 'clientY',
};

const getIntStyles = (element) => {
  const computedStyle = window.getComputedStyle(element);
  const toInt = (str) => parseInt(str, 10);
  const getProp = (prop) => toInt(computedStyle[prop]);
  const getProps = (...props) => props.map((prop) => getProp(prop));
  const getSideProps = (trunk) =>
    ['top', 'right', 'bottom', 'left'].reduce(
      (acc, side) => ({
        ...acc,
        [side]: getProp(`${trunk}-${side}`),
      }),
      {},
    );
  const [width, height] = getProps('width', 'height');
  const margin = getSideProps('margin');
  return {
    width,
    height,
    margin,
  };
};

const calcRectAxis = (clientRectAxis, scrollAxis) =>
  calcAxisByAbsoluteRects ? clientRectAxis + scrollAxis : clientRectAxis;
const toAbsRect = (child) => {
  const { width, height, margin } = getIntStyles(child);
  const clientRect = child.getBoundingClientRect();
  const { x, y } = clientRect;
  const enterable = {
    src: {
      x: x - margin.left,
      y: y - margin.top,
    },
    dst: {
      x: x + width + margin.right,
      y: y + height + margin.bottom,
    },
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom,
  };
  return {
    debugText: child.textContent,
    x: calcRectAxis(x, window.scrollX),
    y: calcRectAxis(y, window.scrollY),
    element: {
      width,
      height,
    },
    margin,
    enterable,
  };
};

const setStaticStyles = (element, styles) =>
  Object.entries(styles).forEach(([prop, value]) => {
    element.style[prop] = value;
  });

const SetGhostPosition =
  (element, { x: offsetX, y: offsetY }) =>
  (mouseEvent) => {
    const nextX = mouseEvent[mousePositionAxes.x] - offsetX;
    const nextY = mouseEvent[mousePositionAxes.y] - offsetY;
    element.style.left = `${nextX}px`;
    element.style.top = `${nextY}px`;
  };

const debugPosition = (mouseEvent, absRect, relRect) => {
  const doX = false;
  const doY = true;
  const { clientX, clientY, offsetX, offsetY, pageX, pageY } = mouseEvent;
  const outX = (value) => (doX ? value : '');
  const outY = (value) => (doY ? value : '');
  const out = (prefix, valX, valY) =>
    `${prefix}:${outX(valX)}${doX && doY ? ',' : ''}${outY(valY)}`;
  console.log(
    out('c', clientX, clientY),
    out('o', offsetX, offsetY),
    out('p', pageX, pageY),
    out('a', absRect.x, absRect.y),
    out('r', relRect.x, relRect.y),
  );
};

const EnteringRectGetter = (absRects) => (mouseEvent) => {
  const mouseX = mouseEvent[mousePositionAxes.x];
  const mouseY = mouseEvent[mousePositionAxes.y];

  const touchingIndex = absRects.findIndex(({ enterable: { src, dst } }) => {
    const isTouchingX = mouseX >= src.x && mouseX <= dst.x;
    const isTouchingY = mouseY >= src.y && mouseY <= dst.y;
    return isTouchingX && isTouchingY;
  });

  return touchingIndex;
};

const debugChildrenTexts = (children) =>
  console.log(
    'phys:',
    Array.from(children).reduce(
      (acc, outing) => `${acc}${outing.textContent},`,
      '',
    ),
  );

const debugAbsRectTexts = (absRects) =>
  console.log(
    'virs:',
    absRects.reduce((acc, { debugText }) => `${acc}${debugText},`, ''),
  );

const isToAfterEntering = (draggingIndex, enteringIndex) =>
  draggingIndex < enteringIndex;

const sortIndexes = (draggingIndex, enteringIndex) => {
  const minIndex = Math.min(draggingIndex, enteringIndex);
  const maxIndex = Math.max(draggingIndex, enteringIndex);

  return Array.from(
    { length: maxIndex - minIndex + 1 },
    (_, i) => minIndex + i,
  );
};

const rotateArray = (array, toForward) =>
  toForward
    ? [...array.slice(1), array[0]]
    : [array.at(-1), ...array.slice(0, -1)];

const extractAbsRects = (absRects, indexes) => indexes.map((i) => absRects[i]);

const exchangeChildren = ({
  children,
  toAfterEntering,
  draggingIndex,
  enteringIndex,
  parent,
}) => {
  const draggingChild = children[draggingIndex];
  const enteringChild = children[enteringIndex];
  const insertingToBeforeChild = toAfterEntering
    ? enteringChild.nextSibling
    : enteringChild;
  parent.insertBefore(draggingChild, insertingToBeforeChild);
};

const childrenToAbsRects = (children, absRects, rangeIndexes) =>
  rangeIndexes.forEach((rangeIndex) => {
    absRects[rangeIndex] = toAbsRect(children[rangeIndex]);
  });
const extractChildArrayExchanged = (children, indexesDomExchanged) =>
  indexesDomExchanged.map((index) => children[index]);
const debugAbsRects = (title, absRects) => {
  console.log('debugAbsRects:', title);
  absRects.forEach(({ debugText, x, y }) => console.log(debugText, x, y));
};

const parallelArraysToMap = (keys, values) =>
  keys.reduce((acc, key, loopIndex) => {
    acc.set(key, values[loopIndex]);
    return acc;
  }, new Map());

const durationMs = 1000;
const exclusiveAnimate = (() => {
  const runnings = new Map();
  const Animate = (element) => {
    return {
      set: (transform = '', transition = '') => {
        if (!element) return;
        element.style.transform = transform;
        element.style.transition = transition;
      },
      onEnd: (whenTransitionEndFunc = () => {}) => {
        const transitionend = () => {
          element.removeEventListener('transitionend', transitionend);
          whenTransitionEndFunc(element);
        };
        element.addEventListener('transitionend', transitionend);
      },
    };
  };
  const finalyze = (element) => {
    Animate(element).set();
    runnings.delete(element);
  };
  const turn = (element) => {
    if (!runnings.has(element)) return;
    Animate(element).set();
    runnings.get(element).turned = true;
  };
  return {
    start: (element, x, y) => {
      if (!runnings.has(element))
        runnings.set(element, { turned: false, startedMs: performance.now() });
      const animate = Animate(element);
      animate.set(`translate(${x}px, ${y}px)`);
      setTimeout(() => {
        // 時間の調整は考える余地がある
        const durationMsUsing =
          durationMs / (runnings.get(element).turned ? 2 : 1);

        // const { turned, startedMs } = runnings.get(element);
        // const durationMsUsing = turned
        //   ? performance.now() - startedMs
        //   : durationMs;
        // runnings.get(element).startedMs = performance.now();

        animate.set('translate(0, 0)', `transform ${durationMsUsing}ms linear`);
        animate.onEnd(() => finalyze(element));
        // 再帰でstyle.transform !== ''になるまで待っても意味なかった
      }, 10);
    },
    turn: (...elements) => elements.forEach((element) => turn(element)),
  };
})();
const animateExcange = (index, child, absRectSrc, absRectDst) => {
  const { x: srcX, y: srcY } = absRectSrc;
  const { x: dstX, y: dstY } = absRectDst;
  const movedX = dstX - srcX;
  const movedY = dstY - srcY;
  exclusiveAnimate.start(child, -movedX, -movedY);
};

const exchangeCore = ({
  indexAbsRectSrcMap,
  indexAbsRectDstMap,
  childArrayExchanged, // 入れ替わったDOM要素配列
}) => {
  // console.log('入替前index', indexesExchangingBefore);
  // console.log('入替後index', indexesExchangingAfter);
  // debugAbsRects('出発座標', absRectsExchangingSrc);
  // debugAbsRects('到着座標', absRectsExchangingDst);

  // indexMapにdomを含めたくなくてループindexを使いたいのと、dst/src取得ステートメントに対称性を持たせるために
  // entriesじゃなくてkeysの配列(にしないと、配列じゃないので)のforEachを使う
  Array.from(indexAbsRectDstMap.keys()).forEach(
    (indexExchangingAfter, loopIndex) => {
      // 完成形の到着座標にあるDOM要素を抜粋
      const child = childArrayExchanged[loopIndex];
      // 入替後indexから到着座標と出発座標を取得
      const absRectDst = indexAbsRectDstMap.get(indexExchangingAfter);
      const absRectSrc = indexAbsRectSrcMap.get(indexExchangingAfter);
      // console.log(
      //   loopIndex,
      //   indexExchangingAfter,
      //   absRectDst,
      //   absRectsDstIndexMap[indexExchangingAfter]
      // );
      animateExcange(indexExchangingAfter, child, absRectSrc, absRectDst);
    },
  );
};

const calcOffsetRectAxis = (absoluteRectAxis, relativeRectAxis, scrollAxis) =>
  calcAxisByAbsoluteRects ? absoluteRectAxis - scrollAxis : relativeRectAxis;
const MouseDownHandler =
  ({ children, child }) =>
  (mouseDownEvent) => {
    const absRects = Array.from(children).map(toAbsRect);
    const getEnteringIndex = EnteringRectGetter(absRects);

    const parent = child.parentElement;
    let draggingIndex = getEnteringIndex(mouseDownEvent);
    const absRect = absRects[draggingIndex];
    const {
      element: { width, height },
      margin,
    } = absRect;
    const relRect = child.getBoundingClientRect();
    // debugPosition(mouseDownEvent, absRect, relRect);
    const clone = child.cloneNode(true);
    clone.classList.add('ghost');
    parent.appendChild(clone);

    setStaticStyles(clone, {
      position: 'fixed',
      width: `${width}px`,
      height: `${height}px`,
    });

    const setGhostPosition = SetGhostPosition(clone, {
      x:
        mouseDownEvent[mousePositionAxes.x] -
        calcOffsetRectAxis(absRect.x, relRect.x, window.scrollX) +
        margin.left,
      y:
        mouseDownEvent[mousePositionAxes.y] -
        calcOffsetRectAxis(absRect.y, relRect.y, window.scrollY) +
        margin.top,
    });

    setGhostPosition(mouseDownEvent);

    const mouseMoveHandler = (mouseMoveEvent) => {
      setGhostPosition(mouseMoveEvent);
      const enteringIndex = getEnteringIndex(mouseMoveEvent);
      if (enteringIndex < 0 || enteringIndex === draggingIndex) return;
      // console.log('start', enteringIndex, draggingIndex);
      const toAfterEntering = isToAfterEntering(draggingIndex, enteringIndex);
      const indexesExchangingBefore = sortIndexes(draggingIndex, enteringIndex);
      const indexesExchangingAfter = rotateArray(
        indexesExchangingBefore,
        toAfterEntering,
      );
      childrenToAbsRects(children, absRects, indexesExchangingBefore);
      const absRectsExchangingSrc = extractAbsRects(
        absRects,
        indexesExchangingBefore,
      );
      // debugAbsRects('出発座標', absRectsExchangingSrc);
      exchangeChildren({
        children,
        toAfterEntering,
        draggingIndex,
        enteringIndex,
        parent,
      });

      // 既に入れ替わった完成系のDOM要素群のindexは、入替前のindexと同じ
      // 後で混乱するので、目的に合わせて命名代入
      const indexesDomExchanged = indexesExchangingBefore;
      const childArrayExchanged = extractChildArrayExchanged(
        children,
        indexesDomExchanged,
      );
      exclusiveAnimate.turn(...childArrayExchanged);

      childrenToAbsRects(children, absRects, indexesDomExchanged);

      const absRectsExchangingDst = extractAbsRects(
        absRects,
        indexesExchangingBefore,
      );
      // debugAbsRects('到着座標', absRectsExchangingDst);

      /*
        indexesExchangingBefore, // 入替前index: [0, 1, 2, 3]
        absRectsExchangingSrc, // 出発座標: [いち(32,32), にい(177,32), さん(322,32), よん(32,176)]

        indexesExchangingAfter, //  入替後index: [1, 2, 3, 0]
        absRectsExchangingDst, // 到着座標: [にい(32,32), さん(177,32), よん(322,32), いち(32,176)]
      */

      // index引き当てがわかりやすくなるようにMapを使う
      // 連想配列だと、index数値をキーにするとソートされて追加順序どおりにならないので、Map
      const indexAbsRectDstMap = parallelArraysToMap(
        indexesExchangingAfter,
        absRectsExchangingDst,
      );

      // 入替後のindex値(after)をもとに、入替前のindex->出発座標まで遡上取得できるように
      const indexAbsRectSrcMap = parallelArraysToMap(
        indexesExchangingBefore,
        absRectsExchangingSrc,
      );

      exchangeCore({
        indexAbsRectSrcMap,
        indexAbsRectDstMap,
        childArrayExchanged,
      });
      // debugAbsRectTexts(absRects);
      draggingIndex = enteringIndex;
    };

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      clone.remove();
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler, { once: true });
  };

export default (parent) => {
  const { children } = parent;

  Array.from(children).forEach((child) => {
    const mouseDownHandler = MouseDownHandler({
      children,
      child,
    });
    child.addEventListener('mousedown', mouseDownHandler);
  });
};
