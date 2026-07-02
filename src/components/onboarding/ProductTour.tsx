'use client';

import { useEffect, useRef } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { OnboardingEndReason, OnboardingStep } from '@/features/onboarding/onboarding-types';
import {
  resolveTourAlign,
  resolveTourPlacement,
  scrollTourTargetIntoView,
} from '@/features/onboarding/onboarding-tour-layout';

type ProductTourProps = {
  steps: OnboardingStep[];
  run: boolean;
  onEnd: (reason: OnboardingEndReason) => void;
};

function isTourTargetVisible(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function filterExistingSteps(steps: OnboardingStep[]): OnboardingStep[] {
  if (typeof document === 'undefined') return [];
  return steps.filter((step) => isTourTargetVisible(step.target));
}

const SIDEBAR_PREPARE_MS = 380;

function prepareHighlightedStep(
  step: OnboardingStep,
  element: Element | undefined,
  driverInstance: Driver,
): void {
  step.beforeShow?.();

  window.setTimeout(() => {
    const target =
      element ?? document.querySelector<HTMLElement>(step.target) ?? undefined;
    scrollTourTargetIntoView(target);
    window.requestAnimationFrame(() => {
      driverInstance.refresh();
    });
  }, step.beforeShow ? SIDEBAR_PREPARE_MS : 0);
}

function toDriverSteps(steps: OnboardingStep[]): DriveStep[] {
  return steps.map((step) => ({
    element: step.target,
    onHighlightStarted: (element, _step, { driver: driverInstance }) => {
      prepareHighlightedStep(step, element, driverInstance);
    },
    popover: {
      title: step.title,
      description: step.content,
      side: resolveTourPlacement(step),
      align: resolveTourAlign(step),
    },
  }));
}

export default function ProductTour({ steps, run, onEnd }: ProductTourProps) {
  const driverRef = useRef<Driver | null>(null);
  const endedRef = useRef(false);
  const onEndRef = useRef(onEnd);

  onEndRef.current = onEnd;

  useEffect(() => {
    if (!run) return;

    endedRef.current = false;
    let started = false;

    const timer = window.setTimeout(() => {
      const visibleSteps = filterExistingSteps(steps);
      if (visibleSteps.length === 0) {
        onEndRef.current('skip');
        return;
      }

      driverRef.current?.destroy();

      const instance = driver({
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.55,
        disableActiveInteraction: true,
        allowScroll: false,
        smoothScroll: false,
        stagePadding: 6,
        stageRadius: 10,
        popoverClass: 'maxwell-driver-popover',
        popoverOffset: 12,
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Finish',
        steps: toDriverSteps(visibleSteps),
        onCloseClick: () => {
          if (endedRef.current) return;
          endedRef.current = true;
          instance.destroy();
          onEndRef.current('skip');
        },
        onDoneClick: () => {
          if (endedRef.current) return;
          endedRef.current = true;
          instance.destroy();
          onEndRef.current('finish');
        },
        onDestroyed: () => {
          driverRef.current = null;
        },
      });

      driverRef.current = instance;
      started = true;
      instance.drive();
    }, 350);

    return () => {
      window.clearTimeout(timer);
      if (started && driverRef.current?.isActive() && !endedRef.current) {
        driverRef.current.destroy();
      }
      driverRef.current = null;
    };
  }, [run, steps]);

  return null;
}
