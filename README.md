# Dragon Drop

依存ライブラリーなしのドラッグ&ドロップ並べ替え試作です。  
SortableJS の流麗なアニメーションを最小構成で再現しました。  
最終的には、在籍企業の private リポジトリーに組み込んで完成させています。  
一定期間のみ public にしています。

## デモ

https://quietnumeric.github.io/dragon-drop/

※ マウス操作のみ対応（スマートフォン非対応）

## やっていること

並べ替えアニメーションは FLIP（First - Last - Invert - Play）です。  
開始時点の全要素座標を計測し、終了時点の全要素座標(DOMを実際に入れ替える)を計測し、差分を算出した上で入れ替え結果の座標をもとに `transform` で差分逆行させてから、可視のアニメーションで入れ替え結果の座標まで動かして見せます。

アニメーション中にさらにユーザーによって入れ替え操作が行われた場合、その時点での `transform` における計算上の座標を確定し、新たな起点として再計算します。

## SortableJSとの違い

- SortableJSは一部CSSの適用のされ方がおかしく(例えばリスト内で排他的に単一要素に掛かるべき `hover` 効果がリスト内の複数要素に掛かる等)、それを是正するためには振る舞いを上書き補正する必要があり、それでも尚残る不自然さがありましたが、それを解消することができています。
  - [varl](https://github.com/quietnumeric/varl) での上書き補正例
    - [JavaScript](https://github.com/quietnumeric/varl/blob/main/libs/draggable-helper.js)
    - [CSS](https://github.com/quietnumeric/varl/blob/main/assets/scss/draggable-helper.scss)
