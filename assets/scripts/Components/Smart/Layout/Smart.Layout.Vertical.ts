import { _decorator, Enum } from 'cc';
import { Smart_Layout_Base, HorizontalAlign, VerticalAlign } from './Smart.Layout.Base';

export { HorizontalAlign, VerticalAlign };

const { ccclass, property } = _decorator;

@ccclass('Smart_Layout_Vertical')
export class Smart_Layout_Vertical extends Smart_Layout_Base {
    @property({ type: Enum(VerticalAlign), tooltip: 'Vertical alignment of children (used when autoSpacing is false)', visible() { return !this.autoSpacing; } })
    protected _verticalAlign: VerticalAlign = VerticalAlign.TOP;
    @property({ type: Enum(VerticalAlign), tooltip: 'Vertical alignment of children (used when autoSpacing is false)', visible() { return !this.autoSpacing; } })
    get verticalAlign(): VerticalAlign { return this._verticalAlign; }
    set verticalAlign(val: VerticalAlign) {
        if (this._verticalAlign !== val) {
            this._verticalAlign = val;
            this._actDirtyLayout();
        }
    }

    @property({ type: Enum(HorizontalAlign), tooltip: 'Horizontal alignment of children across container width' })
    protected _horizontalAlign: HorizontalAlign = HorizontalAlign.CENTER;
    @property({ type: Enum(HorizontalAlign), tooltip: 'Horizontal alignment of children across container width' })
    get horizontalAlign(): HorizontalAlign { return this._horizontalAlign; }
    set horizontalAlign(val: HorizontalAlign) {
        if (this._horizontalAlign !== val) {
            this._horizontalAlign = val;
            this._actDirtyLayout();
        }
    }

    protected _update() {
        if (!this.node || !this.node.isValid) {
            return;
        }

        if (!this._init || this._isChildrenDirty) {
            this._getLayouts();
            this._init = true;
            this._isChildrenDirty = false;
        }

        const count = this._layouts.length;
        if (count === 0) {
            return;
        }

        const container = this.transform;
        if (!container || !container.isValid) {
            return;
        }

        const width = container.width;
        const height = container.height;
        const anchorX = container.anchorX;
        const anchorY = container.anchorY;

        // Vertical usable space (flowing Top to Bottom)
        const bottomEdge = -height * anchorY;
        const usableBottomY = bottomEdge + this._paddingBottom;
        const usableTopY = bottomEdge + height - this._paddingTop;
        const usableHeight = height - this._paddingTop - this._paddingBottom;

        // Horizontal alignment targets
        const leftEdge = -width * anchorX;
        const targetLeftX = leftEdge + this._paddingLeft;
        const targetRightX = leftEdge + width - this._paddingRight;
        const targetCenterX = (targetLeftX + targetRightX) * 0.5;

        // Calculate total children height (taking scaleY into account)
        let totalChildrenHeight = 0;
        for (let i = 0; i < count; ++i) {
            const childTrans = this._layouts[i];
            const scaleY = childTrans.node.scale.y;
            totalChildrenHeight += childTrans.height * Math.abs(scaleY);
        }

        let spacing = this._spacing;
        let currentTop = usableTopY;

        if (this._autoSpacing) {
            if (count > 1) {
                const totalGap = usableHeight - totalChildrenHeight;
                spacing = totalGap / (count - 1);
                currentTop = usableTopY;
            } else {
                // Single child: align vertically according to verticalAlign
                const childHeight = totalChildrenHeight;
                switch (this._verticalAlign) {
                    case VerticalAlign.BOTTOM:
                        currentTop = usableBottomY + childHeight;
                        break;
                    case VerticalAlign.CENTER:
                        currentTop = usableTopY - (usableHeight - childHeight) * 0.5;
                        break;
                    case VerticalAlign.TOP:
                    default:
                        currentTop = usableTopY;
                        break;
                }
            }
        } else {
            const totalLayoutHeight = totalChildrenHeight + spacing * (count - 1);
            switch (this._verticalAlign) {
                case VerticalAlign.BOTTOM:
                    currentTop = usableBottomY + totalLayoutHeight;
                    break;
                case VerticalAlign.CENTER:
                    currentTop = usableTopY - (usableHeight - totalLayoutHeight) * 0.5;
                    break;
                case VerticalAlign.TOP:
                default:
                    currentTop = usableTopY;
                    break;
            }
        }

        for (let i = 0; i < count; ++i) {
            const childTrans = this._layouts[i];
            if (!childTrans || !childTrans.isValid) continue;

            const childNode = childTrans.node;
            if (!childNode || !childNode.isValid) continue;

            const scaleY = childNode.scale.y;
            const absScaleY = Math.abs(scaleY);
            const childHeight = childTrans.height * absScaleY;

            const anchorOffsetY = scaleY >= 0
                ? childTrans.anchorY * childHeight
                : (1 - childTrans.anchorY) * childHeight;

            // Target top of child is currentTop; position Y is placed so top edge is at currentTop:
            const posY = currentTop - (childHeight - anchorOffsetY);

            // Calculate X position
            let posX = childNode.position.x;
            if (this._horizontalAlign !== HorizontalAlign.NONE) {
                const scaleX = childNode.scale.x;
                const absScaleX = Math.abs(scaleX);
                const childWidth = childTrans.width * absScaleX;

                const anchorOffsetX = scaleX >= 0
                    ? childTrans.anchorX * childWidth
                    : (1 - childTrans.anchorX) * childWidth;

                switch (this._horizontalAlign) {
                    case HorizontalAlign.LEFT:
                        posX = targetLeftX + anchorOffsetX;
                        break;
                    case HorizontalAlign.RIGHT:
                        posX = targetRightX - (childWidth - anchorOffsetX);
                        break;
                    case HorizontalAlign.CENTER:
                        posX = targetCenterX - childWidth * 0.5 + anchorOffsetX;
                        break;
                }
            }

            const curPos = childNode.position;
            if (Math.abs(curPos.x - posX) > 1e-3 || Math.abs(curPos.y - posY) > 1e-3) {
                childNode.setPosition(posX, posY, curPos.z);
            }

            currentTop -= (childHeight + spacing);
        }
    }
}
