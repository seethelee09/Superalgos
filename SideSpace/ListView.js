function newListView () {
  const MODULE_NAME = 'List View'
  const ERROR_LOG = true
  const logger = newWebDebugLog()
  logger.fileName = MODULE_NAME

  let thisObject = {
    fitFunction: undefined,
    container: undefined,
    listItems: [],
    payload: undefined,
    isVisible: false,
    reload: reload,
    physics: physics,
    draw: draw,
    getContainer: getContainer,
    initialize: initialize,
    finalize: finalize
  }

  thisObject.container = newContainer()
  thisObject.container.initialize()
  thisObject.container.isDraggeable = false
  thisObject.container.isWheelable = true
  thisObject.container.detectMouseOver = true

  let isInitialized = false

  let listItemsMap = new Map()
  let visibleListItems = []
  let firstVisibleListItem = 1

  let headerHeight = 40
  let footerHeight = 30
  let listItemHeight = SIDE_PANEL_WIDTH * 0.75

  let posibleVisibleListItems

  let itemSeparation

  let onMouseWheelEventSuscriptionId
  let onMouseOverEventSubscriptionId
  let onMouseNotOverEventSubscriptionId

  let isMouseOver
  return thisObject

  function finalize () {
    thisObject.container.eventHandler.stopListening(onMouseWheelEventSuscriptionId)
    thisObject.container.eventHandler.stopListening(onMouseOverEventSubscriptionId)
    thisObject.container.eventHandler.stopListening(onMouseNotOverEventSubscriptionId)

    listItemsMap = undefined
    visibleListItems = undefined

    thisObject.container.finalize()
    thisObject.container = undefined

    thisObject.payload = undefined
    thisObject = undefined
  }

  function initialize () {
    thisObject.container.name = MODULE_NAME
    thisObject.container.frame.containerName = thisObject.container.name
    thisObject.container.frame.width = SIDE_PANEL_WIDTH * 0.75

    let position = { // Default position
      x: SIDE_PANEL_WIDTH * 0.25 / 2,
      y: 20
    }

    thisObject.container.frame.position = position
    thisObject.container.frame.height = browserCanvas.height - position.x

    posibleVisibleListItems = (thisObject.container.frame.height - headerHeight - footerHeight) / (listItemHeight)
    itemSeparation = ((thisObject.container.frame.height - headerHeight - footerHeight) - listItemHeight * Math.trunc(posibleVisibleListItems)) / (Math.trunc(posibleVisibleListItems) - 1)

    onMouseWheelEventSuscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseWheel', onMouseWheel)
    onMouseOverEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseOver', onMouseOver)
    onMouseNotOverEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseNotOver', onMouseNotOver)

    reload()
  }

  function reload () {
    callServer(undefined, 'ListWorkspaces', onResponse)

    function onResponse (err, text) {
      if (err && err.result !== GLOBAL.DEFAULT_OK_RESPONSE.result) {
        if (ERROR_LOG === true) { logger.write('[ERROR] initialize -> Could not load the list of your workspaces from the backend.  ') }
        return
      }

      let workspacelist = JSON.parse(text)
      thisObject.listItems = []
      for (let i = 0; i < workspacelist.length; i++) {
        let workspace = workspacelist[i].replace('.json', '')
        let listItem = newListItem()
        listItem.initialize(workspace, 'Workspace')
        listItem.container.connectToParent(thisObject.container, false, false)
        listItem.container.frame.position.y = headerHeight + i * SIDE_PANEL_WIDTH * 0.75 + itemSeparation * i

        thisObject.listItems.push(listItem)
      }
      isInitialized = true
    }
  }

  function onMouseOver (event) {
    isMouseOver = true
  }

  function onMouseNotOver () {
    isMouseOver = false
  }

  function onMouseWheel (event) {
    delta = event.wheelDelta
    if (delta > 0) {
      delta = -1
    } else {
      delta = 1
    }

    firstVisibleListItem = firstVisibleListItem + delta

    calculateVisbleListItems()
  }

  function calculateVisbleListItems () {
    let availableSlots = posibleVisibleListItems

    if (firstVisibleListItem < 1) { firstVisibleListItem = 1 }
    if (firstVisibleListItem > (thisObject.listItems.length - availableSlots + 1)) { firstVisibleListItem = thisObject.listItems.length - availableSlots + 1 }

    visibleListItems = []

    for (let i = 0; i < thisObject.listItems.length; i++) {
      if (i + 1 >= firstVisibleListItem && i + 1 < firstVisibleListItem + availableSlots) {
        let listItem = thisObject.listItems[i]

        listItem.container.frame.position.x = 0
        listItem.container.frame.position.y = (listItemHeight + itemSeparation) * visibleListItems.length + headerHeight

         /* Add to Visible Product Array */
        visibleListItems.push(listItem)
      }
    }
  }

  function getContainer (point, purpose) {
    if (isInitialized === false || thisObject.visible === false || thisObject.isHidden === true) { return }
    let container

    if (isMouseOver === true && purpose !== GET_CONTAINER_PURPOSE.MOUSE_OVER) {
      container = thisObject.upDownButton.getContainer(point)
      if (container !== undefined) { return container }

      container = thisObject.leftRightButton.getContainer(point)
      if (container !== undefined) { return container }
    }

     /* First we check if thisObject point is inside thisObject space. */
    if (thisObject.container.frame.isThisPointHere(point, true) === true) {
       /* Now we see which is the inner most container that has it */
      for (let i = 0; i < visibleListItems.length; i++) {
        container = visibleListItems[i].getContainer(point)

        if (container !== undefined) {
          let checkPoint = {
            x: point.x,
            y: point.y
          }

          checkPoint = thisObject.fitFunction(checkPoint)

          if (point.x === checkPoint.x && point.y === checkPoint.y) {
            if (purpose !== GET_CONTAINER_PURPOSE.MOUSE_OVER) {
              return container
            }
          }
        }
      }

     /* The point does not belong to any inner container, so we return the current container. */
      let checkPoint = {
        x: point.x,
        y: point.y
      }

      checkPoint = thisObject.fitFunction(checkPoint)

      if (point.x === checkPoint.x && point.y === checkPoint.y) {
        return thisObject.container
      }
    }
  }

  function childrenPhysics () {
    for (let i = 0; i < thisObject.listItems.length; i++) {
      let listItem = thisObject.listItems[i]
      listItem.physics()
    }
  }

  function physics () {
    if (isInitialized === false) { return }
    if (thisObject.isVisible === false) { return }
    childrenPhysics()
  }

  function draw () {
    if (isInitialized === false || thisObject.visible === false) { return }

    drawBackground()
    drawChildren()
    drawScrollBar()
  }

  function drawChildren () {
    for (let i = 0; i < thisObject.listItems.length; i++) {
      let listItem = thisObject.listItems[i]
      listItem.draw()
    }
  }

  function drawBackground () {
    let label = 'Your Workspaces'

    let backgroundColor = UI_COLOR.WHITE
    let params = {
      cornerRadius: 5,
      lineWidth: 1,
      container: thisObject.container,
      borderColor: UI_COLOR.RUSTED_RED,
      castShadow: false,
      backgroundColor: backgroundColor,
      opacity: 1
    }

    roundedCornersBackground(params)

    drawLabel(label, 1 / 2, 0, 0, 25, 15, thisObject.container, UI_COLOR.BLACK)
  }

  function drawScrollBar () {
    if (thisObject.listItems.length > posibleVisibleListItems && posibleVisibleListItems > 0) {
      let xOffset = 4
      let barTopPoint = {
        x: thisObject.container.frame.width - xOffset,
        y: headerHeight
      }
      let barBottomPoint = {
        x: thisObject.container.frame.width - xOffset,
        y: thisObject.container.frame.height - footerHeight
      }
      let ratio = posibleVisibleListItems / thisObject.listItems.length
      let handleHeight = (posibleVisibleListItems * (listItemHeight + itemSeparation)) * ratio
      let handleTopPoint = {
        x: thisObject.container.frame.width - xOffset,
        y: headerHeight + (listItemHeight + itemSeparation) * ratio * (firstVisibleListItem - 1)
      }
      let handleBottomPoint = {
        x: thisObject.container.frame.width - xOffset,
        y: handleTopPoint.y + handleHeight
      }
      barTopPoint = thisObject.container.frame.frameThisPoint(barTopPoint)
      barBottomPoint = thisObject.container.frame.frameThisPoint(barBottomPoint)
      handleTopPoint = thisObject.container.frame.frameThisPoint(handleTopPoint)
      handleBottomPoint = thisObject.container.frame.frameThisPoint(handleBottomPoint)

      browserCanvasContext.beginPath()
      browserCanvasContext.moveTo(barTopPoint.x, barTopPoint.y)
      browserCanvasContext.lineTo(barBottomPoint.x, barBottomPoint.y)
      browserCanvasContext.closePath()
      browserCanvasContext.setLineDash([0, 0])
      browserCanvasContext.lineWidth = 1
      browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.GREY + ', ' + 1 + ')'
      browserCanvasContext.stroke()

      browserCanvasContext.beginPath()
      browserCanvasContext.moveTo(handleTopPoint.x, handleTopPoint.y)
      browserCanvasContext.lineTo(handleBottomPoint.x, handleBottomPoint.y)
      browserCanvasContext.closePath()
      browserCanvasContext.setLineDash([0, 0])
      browserCanvasContext.lineWidth = 4
      browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.PATINATED_TURQUOISE + ', ' + 1 + ')'
      browserCanvasContext.stroke()
    }
  }
}
