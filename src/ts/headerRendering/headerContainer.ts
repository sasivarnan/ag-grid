import _ from '../utils';
import {ColumnGroupChild} from "../entities/columnGroupChild";
import ColumnGroup from "../entities/columnGroup";
import GridOptionsWrapper from "../gridOptionsWrapper";
import {Autowired} from "../context/context";
import {IRenderedHeaderElement} from "./iRenderedHeaderElement";
import Column from "../entities/column";
import {Context} from "../context/context";
import RenderedHeaderGroupCell from "./renderedHeaderGroupCell";
import RenderedHeaderCell from "./renderedHeaderCell";
import {DragAndDropService2} from "../dragAndDrop/dragAndDropService2";
import {MoveColumnController2} from "./moveColumnController2";
import {ColumnController} from "../columnController/columnController";

export class HeaderContainer {

    @Autowired('gridOptionsWrapper') private gridOptionsWrapper: GridOptionsWrapper;
    @Autowired('context') private context: Context;
    @Autowired('$scope') private $scope: any;
    @Autowired('dragAndDropService2') private dragAndDropService2: DragAndDropService2;
    @Autowired('moveColumnController2') private moveColumnController2: MoveColumnController2;
    @Autowired('columnController') private columnController: ColumnController;

    private eContainer: HTMLElement;
    private eRoot: HTMLElement;

    private pinned: string;

    private headerElements: IRenderedHeaderElement[] = [];

    constructor(eContainer: HTMLElement, eRoot: HTMLElement, pinned: string) {
        this.eContainer = eContainer;
        this.eRoot = eRoot;
        this.pinned = pinned;
    }

    public agPostWire(): void {
        this.dragAndDropService2.addDropTarget(
            {eElement: this.eContainer, onDragCallback: this.onDrag.bind(this)}
        );
    }

    private onDrag(params: any): void {
        this.moveColumnController2.dragOver(params.x, this.pinned, params.dragItem, params.direction);
        //if (params.dragSource===this) {
        //    console.log('internal drag');
        //} else {
        //    console.log('external drag');
        //}
    }

    public removeAllChildren(): void {
        this.headerElements.forEach( (headerElement: IRenderedHeaderElement) => {
            headerElement.destroy();
        });
        this.headerElements.length = 0;
        _.removeAllChildren(this.eContainer);
    }

    public insertHeaderRowsIntoContainer(): void {

        var cellTree = this.columnController.getDisplayedColumnGroups(this.pinned);

        // if we are displaying header groups, then we have many rows here.
        // go through each row of the header, one by one.
        var rowHeight = this.gridOptionsWrapper.getHeaderHeight();
        for (var dept = 0; ; dept++) {

            var nodesAtDept: ColumnGroupChild[] = [];
            this.addTreeNodesAtDept(cellTree, dept, nodesAtDept);

            // we want to break the for loop when we get to an empty set of cells,
            // that's how we know we have finished rendering the last row.
            if (nodesAtDept.length===0) {
                break;
            }

            var eRow: HTMLElement = document.createElement('div');
            eRow.className = 'ag-header-row';
            eRow.style.top = (dept * rowHeight) + 'px';
            eRow.style.height = rowHeight + 'px';

            nodesAtDept.forEach( (child: ColumnGroupChild) => {

                // skip groups that have no displayed children. this can happen when the group is broken,
                // and this section happens to have nothing to display for the open / closed state
                if (child instanceof ColumnGroup && (<ColumnGroup>child).getDisplayedChildren().length==0) {
                    return;
                }

                var renderedHeaderElement = this.createHeaderElement(child);
                this.headerElements.push(renderedHeaderElement);
                var eGui = renderedHeaderElement.getGui();
                eRow.appendChild(eGui);
            });

            this.eContainer.appendChild(eRow);
        }

    }

    private addTreeNodesAtDept(cellTree: ColumnGroupChild[], dept: number, result: ColumnGroupChild[]): void {
        cellTree.forEach( (abstractColumn) => {
            if (dept===0) {
                result.push(abstractColumn);
            } else if (abstractColumn instanceof ColumnGroup) {
                var columnGroup = <ColumnGroup> abstractColumn;
                this.addTreeNodesAtDept(columnGroup.getDisplayedChildren(), dept-1, result);
            } else {
                // we are looking for children past a column, so have come to the end,
                // do nothing, and because the tree is balanced, the result of this recursion
                // will be an empty list.
            }
        });
    }

    private createHeaderElement(columnGroupChild: ColumnGroupChild): IRenderedHeaderElement {
        var result: IRenderedHeaderElement;
        if (columnGroupChild instanceof ColumnGroup) {
            result = new RenderedHeaderGroupCell(<ColumnGroup> columnGroupChild, this.eRoot, this.$scope);
        } else {
            result = new RenderedHeaderCell(<Column> columnGroupChild, this.$scope, this.eRoot, this);
        }
        this.context.wireBean(result);
        return result;
    }

    public updateSortIcons() {
        this.headerElements.forEach( (headerElement: IRenderedHeaderElement) => {
            headerElement.refreshSortIcon();
        });
    }

    public updateFilterIcons() {
        this.headerElements.forEach( (headerElement: IRenderedHeaderElement) => {
            headerElement.refreshFilterIcon();
        });
    }

    public onIndividualColumnResized(column: Column): void {
        this.headerElements.forEach( (headerElement: IRenderedHeaderElement) => {
            headerElement.onIndividualColumnResized(column);
        });
    }

    public getBoundingLeft(): number {
        return this.eContainer.getBoundingClientRect().left;
    }
}