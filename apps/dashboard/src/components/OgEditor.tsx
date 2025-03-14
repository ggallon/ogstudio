"use client";
import { useEffect, useRef } from "react";
import { Box, Flex } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OGElement } from "../lib/types";
import { createDefaultElement, createElementId } from "../lib/elements";
import { useElementsStore } from "../stores/elementsStore";
import { useImagesStore } from "../stores/imagesStore";
import { useAdjustedZoom } from "../lib/hooks/useAdjustedZoom";
import { Element } from "./Element";
import { RightPanel } from "./RightPanel";
import { LeftPanel } from "./LeftPanel";
import { EditorToolbar } from "./EditorToolbar";
import { EditorTitle } from "./EditorTitle";

interface OgProviderProps {
  imageId: string;
  width: number;
  height: number;
}

let elementIdToCopy: string | undefined;

export function hasElementInClipboard() {
  return elementIdToCopy !== undefined;
}

export function OgEditor({ imageId, width, height }: OgProviderProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const {
    selectedElementId,
    setSelectedElementId,
    elements,
    updateElement,
    removeElement,
    addElement,
    loadImage,
  } = useElementsStore();
  const { undo, redo } = useElementsStore.temporal.getState();
  const setSelectedImageId = useImagesStore(
    (state) => state.setSelectedImageId,
  );
  const adjustedZoom = useAdjustedZoom();

  /**
   * When the editor image is updated or loaded for the first time, reset every
   * state, and load the elements and fonts.
   */
  useEffect(() => {
    // If the image doesn't exist, redirect to the images page
    if (!loadImage(imageId)) {
      router.push("/my-images");
      return;
    }

    if (useImagesStore.persist.hasHydrated()) {
      setSelectedImageId(imageId);
    }

    useImagesStore.persist.onFinishHydration(() => {
      setSelectedImageId(imageId);
    });
  }, [imageId, loadImage, router, setSelectedImageId]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const element = event.target as HTMLElement;

      if (
        element.classList.contains("element") ||
        element.classList.contains("handle") ||
        element === rootRef.current
      ) {
        return;
      }

      setSelectedElementId(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      // If we're not focusing the body, don't do anything
      if (event.target !== document.body) {
        return;
      }

      // Move down
      if (event.key === "ArrowDown" && selectedElementId) {
        event.preventDefault();
        const element = elements.find((item) => item.id === selectedElementId);

        if (element) {
          updateElement({
            ...element,
            y: element.y + (event.shiftKey ? 10 : 1),
          });
        }
      }

      // Move up
      if (event.key === "ArrowUp" && selectedElementId) {
        event.preventDefault();
        const element = elements.find((item) => item.id === selectedElementId);

        if (element) {
          updateElement({
            ...element,
            y: element.y - (event.shiftKey ? 10 : 1),
          });
        }
      }

      // Move left
      if (event.key === "ArrowLeft" && selectedElementId) {
        event.preventDefault();
        const element = elements.find((item) => item.id === selectedElementId);

        if (element) {
          updateElement({
            ...element,
            x: element.x - (event.shiftKey ? 10 : 1),
          });
        }
      }

      // Move right
      if (event.key === "ArrowRight" && selectedElementId) {
        event.preventDefault();
        const element = elements.find((item) => item.id === selectedElementId);

        if (element) {
          updateElement({
            ...element,
            x: element.x + (event.shiftKey ? 10 : 1),
          });
        }
      }

      // Delete any selected element
      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedElementId
      ) {
        event.preventDefault();
        removeElement(selectedElementId);
      }

      // Unselect any selected element when pressing escape
      if (event.key === "Escape" && selectedElementId) {
        event.preventDefault();
        setSelectedElementId(null);
      }

      // Undo
      if (event.key === "z" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        undo();
      }

      // Redo
      if (event.key === "Z" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        redo();
      }

      // Copy an element
      if (
        selectedElementId &&
        event.key === "c" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        elementIdToCopy = selectedElementId;
      }

      // Paste a copied element
      if (event.key === "v" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();

        const elementToCopy = elements.find(
          (item) => item.id === elementIdToCopy,
        );

        if (elementToCopy) {
          const newElement: OGElement = {
            ...elementToCopy,
            x: elementToCopy.x + 10,
            y: elementToCopy.y + 10,
            id: createElementId(),
          };

          addElement(newElement);
          elementIdToCopy = newElement.id;
        }
      }

      // When trying to save the document, show a toast
      if (event.key === "s" && (event.metaKey || event.ctrlKey)) {
        event.stopPropagation();
        toast("Your work is saved automatically!");
      }

      // Insert elements with keyboard shortcuts
      if (event.key === "t") {
        event.preventDefault();
        addElement(createDefaultElement("text"));
      }

      if (event.key === "b") {
        event.preventDefault();
        addElement(createDefaultElement("box"));
      }

      if (event.key === "o") {
        event.preventDefault();
        addElement(createDefaultElement("rounded-box"));
      }

      if (event.key === "i") {
        event.preventDefault();
        addElement(createDefaultElement("image"));
      }

      if (event.key === "d") {
        event.preventDefault();
        addElement(createDefaultElement("dynamic-text"));
      }
    }

    const ref = rootRef.current;

    if (imageId !== "splash") {
      if (ref) {
        ref.addEventListener("click", onClick);
      }

      document.body.addEventListener("keydown", onKeyDown);
    }

    return () => {
      if (ref) {
        ref.removeEventListener("click", onClick);
      }

      document.body.removeEventListener("keydown", onKeyDown);
    };
  }, [
    rootRef,
    selectedElementId,
    removeElement,
    addElement,
    elements,
    setSelectedElementId,
    updateElement,
    redo,
    undo,
    imageId,
  ]);

  return (
    <Flex
      align="center"
      className="overflow-hidden"
      height="100vh"
      justify="between"
      style={{ backgroundColor: "var(--gray-2)" }}
      width="100vw"
    >
      <Box
        className="z-10"
        height="100vh"
        style={{
          backgroundColor: "var(--gray-1)",
          boxShadow: "var(--shadow-3)",
        }}
        width="300px"
      >
        <LeftPanel />
      </Box>
      <EditorTitle />
      <Flex
        align="center"
        className="transform  -translate-x-1/2"
        direction="column"
        gap="4"
        left="50%"
        position="fixed"
      >
        <Box
          position="relative"
          style={{
            width,
            height,
            transform: `scale(${adjustedZoom})`,
            boxShadow: "var(--shadow-3)",
            backgroundColor: "var(--gray-1)",
          }}
        >
          <div
            ref={rootRef}
            style={{ display: "flex", width: "100%", height: "100%" }}
          >
            {elements.map((element) => (
              <Element element={element} key={element.id} />
            ))}
          </div>
        </Box>
        <Box
          className="pointer-events-none"
          position="absolute"
          style={{
            width,
            height,
            transform: `scale(${adjustedZoom})`,
            border: "1px solid var(--gray-contrast)",
          }}
        />
        <EditorToolbar />
      </Flex>
      <Box
        className="z-10"
        height="100vh"
        style={{
          backgroundColor: "var(--gray-1)",
          boxShadow: "var(--shadow-3)",
        }}
        width="300px"
      >
        <RightPanel />
      </Box>
    </Flex>
  );
}
